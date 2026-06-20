import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS } from '../../infrastructure/cache/redis.provider';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { EventBus } from '../../infrastructure/events/event-bus';
import { File } from './entities/file.entity';
import { UpdateFileDto } from './dto/update-file.dto';

const PRESIGNED_URL_TTL_SECONDS = 3600;
const PRESIGNED_URL_CACHE_TTL_SECONDS = 3000;
const PRESIGNED_URL_CACHE_KEY_PREFIX = 'file:download:';
const FILE_S3_KEY_PREFIX = 'files/';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/mpeg',
  'audio/mpeg',
  'audio/wav',
]);

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly storageService: StorageService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly eventBus: EventBus,
  ) {}

  async upload(
    uploadedById: string,
    uploadedFile: Express.Multer.File,
    folderId?: string,
  ): Promise<File> {
    if (!uploadedFile) {
      throw new BadRequestException('No file provided');
    }

    this.validateMimeType(uploadedFile.mimetype);

    const resolvedFolderId = folderId ?? null;
    const nextVersion = await this.resolveNextVersion(
      uploadedFile.originalname,
      resolvedFolderId,
      uploadedById,
    );

    const fileId = crypto.randomUUID();
    const s3Key = `${FILE_S3_KEY_PREFIX}${uploadedById}/${fileId}/${uploadedFile.originalname}`;

    await this.storageService.upload(
      s3Key,
      uploadedFile.buffer,
      uploadedFile.mimetype,
    );

    try {
      const file = this.fileRepository.create({
        id: fileId,
        name: uploadedFile.originalname,
        s3Key,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        folderId: resolvedFolderId,
        uploadedById,
        version: nextVersion,
      });
      const saved = await this.fileRepository.save(file);
      this.eventBus.fileCreated.next({
        fileId: saved.id,
        ownerId: uploadedById,
      });
      if (resolvedFolderId !== null) {
        this.eventBus.fileStorageChanged.next({
          folderId: resolvedFolderId,
          sizeDelta: saved.size,
        });
      }
      return saved;
    } catch (error) {
      await this.storageService.delete(s3Key);
      throw error;
    }
  }

  async findById(id: string, uploadedById: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id, uploadedById, isDeleted: false },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getDownloadUrl(
    id: string,
    uploadedById: string,
  ): Promise<{ url: string }> {
    const cacheKey = `${PRESIGNED_URL_CACHE_KEY_PREFIX}${id}`;
    const cachedUrl = await this.redis.get(cacheKey);
    if (cachedUrl) {
      return { url: cachedUrl };
    }

    const file = await this.findById(id, uploadedById);
    const presignedUrl = await this.storageService.getPresignedUrl(
      file.s3Key,
      PRESIGNED_URL_TTL_SECONDS,
    );

    await this.redis.set(
      cacheKey,
      presignedUrl,
      'EX',
      PRESIGNED_URL_CACHE_TTL_SECONDS,
    );
    return { url: presignedUrl };
  }

  async update(
    id: string,
    uploadedById: string,
    dto: UpdateFileDto,
  ): Promise<File> {
    const file = await this.findById(id, uploadedById);

    const updatedFields: Partial<File> = {};
    if (dto.name !== undefined) {
      updatedFields.name = dto.name;
    }
    if (dto.folderId !== undefined) {
      updatedFields.folderId = dto.folderId;
      await this.invalidateDownloadUrlCache(id);
    }

    if (Object.keys(updatedFields).length === 0) {
      return file;
    }

    await this.fileRepository.update(id, updatedFields);

    if (dto.folderId !== undefined && dto.folderId !== file.folderId) {
      if (file.folderId !== null) {
        this.eventBus.fileStorageChanged.next({
          folderId: file.folderId,
          sizeDelta: -file.size,
        });
      }
      if (dto.folderId !== null) {
        this.eventBus.fileStorageChanged.next({
          folderId: dto.folderId,
          sizeDelta: file.size,
        });
      }
    }

    return this.findById(id, uploadedById);
  }

  async softDelete(id: string, uploadedById: string): Promise<void> {
    const file = await this.findById(id, uploadedById);
    await this.fileRepository.update(id, { isDeleted: true });
    await this.invalidateDownloadUrlCache(id);
    if (file.folderId !== null) {
      this.eventBus.fileStorageChanged.next({
        folderId: file.folderId,
        sizeDelta: -file.size,
      });
    }
  }

  async getVersions(id: string, uploadedById: string): Promise<File[]> {
    const currentFile = await this.findById(id, uploadedById);

    return this.fileRepository.find({
      where: {
        name: currentFile.name,
        folderId: currentFile.folderId ?? IsNull(),
        uploadedById: currentFile.uploadedById,
      },
      order: { version: 'DESC' },
    });
  }

  async findByFolder(
    folderId: string | null,
    uploadedById: string,
  ): Promise<File[]> {
    return this.fileRepository.find({
      where: { folderId: folderId ?? IsNull(), uploadedById, isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  async search(uploadedById: string, query: string): Promise<File[]> {
    return this.fileRepository
      .createQueryBuilder('file')
      .where('file.uploadedById = :uploadedById', { uploadedById })
      .andWhere('file.isDeleted = false')
      .andWhere('file.name ILIKE :query', { query: `%${query}%` })
      .orderBy('file.name', 'ASC')
      .getMany();
  }

  private async resolveNextVersion(
    name: string,
    folderId: string | null,
    uploadedById: string,
  ): Promise<number> {
    const latestVersion = await this.fileRepository.findOne({
      where: {
        name,
        folderId: folderId ?? IsNull(),
        uploadedById,
        isDeleted: false,
      },
      order: { version: 'DESC' },
    });

    const firstVersion = 1;
    return latestVersion ? latestVersion.version + 1 : firstVersion;
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new UnsupportedMediaTypeException(
        `File type "${mimeType}" is not allowed`,
      );
    }
  }

  private async invalidateDownloadUrlCache(fileId: string): Promise<void> {
    await this.redis.del(`${PRESIGNED_URL_CACHE_KEY_PREFIX}${fileId}`);
  }
}
