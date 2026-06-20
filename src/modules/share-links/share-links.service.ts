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
import { ShareLink } from './entities/share-link.entity';
import { CreateShareLinkDto } from './dto/create-share-link.dto';

const BCRYPT_SALT_ROUNDS = 10;
const MILLISECONDS_PER_SECOND = 1000;

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
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

    try {
      return await this.shareLinkRepository.save(link);
    } catch (error) {
      if (isPostgresFkViolation(error)) {
        throw new BadRequestException('File not found');
      }
      throw error;
    }
  }

  async findByToken(token: string, password?: string): Promise<ShareLink> {
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

    await this.shareLinkRepository.increment({ token }, 'downloadCount', 1);
    link.downloadCount += 1;

    return link;
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
}
