import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { isPostgresFkViolation } from '../../common/constants/postgres-error-codes';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ShareLink } from './entities/share-link.entity';
import { CreateShareLinkDto } from './dto/create-share-link.dto';

const BCRYPT_SALT_ROUNDS = 10;
const MILLISECONDS_PER_SECOND = 1000;
const PRESIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createdById: string,
    dto: CreateShareLinkDto,
  ): Promise<ShareLink> {
    const expiresAt = dto.ttlSeconds
      ? new Date(Date.now() + dto.ttlSeconds * MILLISECONDS_PER_SECOND)
      : null;

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
      : null;

    const link = this.shareLinkRepository.create({
      fileId: dto.fileId,
      createdById,
      expiresAt,
      passwordHash,
      maxDownloads: dto.maxDownloads ?? null,
    });

    await this.shareLinkRepository.update(
      { fileId: dto.fileId, createdById, isActive: true },
      { isActive: false },
    );

    try {
      return await this.shareLinkRepository.save(link);
    } catch (error) {
      if (isPostgresFkViolation(error)) {
        throw new BadRequestException('File not found');
      }
      throw error;
    }
  }

  async findByFile(fileId: string, userId: string): Promise<ShareLink | null> {
    return this.shareLinkRepository.findOne({
      where: { fileId, createdById: userId, isActive: true },
    });
  }

  async findAllByUser(userId: string): Promise<ShareLink[]> {
    return this.shareLinkRepository.find({
      where: { createdById: userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByToken(token: string, password?: string): Promise<ShareLink> {
    return this.validateLink(token, password);
  }

  async getDownloadUrl(token: string, password?: string): Promise<{ url: string }> {
    const link = await this.validateLink(token, password);
    await this.shareLinkRepository.increment({ token }, 'downloadCount', 1);
    const url = await this.storageService.getPresignedUrl(
      link.file.s3Key,
      PRESIGNED_URL_TTL_SECONDS,
    );
    return { url };
  }

  async deactivate(id: string, userId: string): Promise<void> {
    const link = await this.shareLinkRepository.findOne({
      where: { token: id },
    });
    if (!link) {
      throw new NotFoundException('Share link not found');
    }
    if (link.createdById !== userId) {
      throw new ForbiddenException('You did not create this share link');
    }
    await this.shareLinkRepository.update(id, { isActive: false });
  }

  private async validateLink(token: string, password?: string): Promise<ShareLink> {
    const link = await this.shareLinkRepository.findOne({
      where: { token },
      relations: { file: true },
    });

    if (!link || !link.isActive) {
      throw new NotFoundException('Share link not found');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException('Share link has expired');
    }

    if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
      throw new GoneException('Share link download limit reached');
    }

    if (link.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }
      const isPasswordValid = await bcrypt.compare(password, link.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    return link;
  }
}
