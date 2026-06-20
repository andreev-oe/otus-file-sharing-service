import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileDto } from '../../files/dto/file.dto';
import { ShareLink } from '../entities/share-link.entity';

export class ShareLinkDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  token: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  fileId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  createdById: string;

  @ApiProperty({ example: '2024-01-15T11:00:00.000Z', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: 10, nullable: true })
  maxDownloads: number | null;

  @ApiProperty({ example: 3 })
  downloadCount: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ type: () => FileDto })
  file?: FileDto;

  static fromEntity(link: ShareLink): ShareLinkDto {
    const dto = new ShareLinkDto();
    dto.token = link.token;
    dto.fileId = link.fileId;
    dto.createdById = link.createdById;
    dto.expiresAt = link.expiresAt;
    dto.maxDownloads = link.maxDownloads;
    dto.downloadCount = link.downloadCount;
    dto.isActive = link.isActive;
    dto.createdAt = link.createdAt;
    if (link.file) {
      dto.file = FileDto.fromEntity(link.file);
    }
    return dto;
  }
}
