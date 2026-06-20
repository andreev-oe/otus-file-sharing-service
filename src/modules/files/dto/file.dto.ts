import { ApiProperty } from '@nestjs/swagger';
import { File } from '../entities/file.entity';

export class FileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'report.pdf' })
  name: string;

  @ApiProperty({ example: 'text/plain' })
  mimeType: string;

  @ApiProperty({ example: 204800 })
  size: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  folderId: string | null;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  uploadedById: string;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(file: File): FileDto {
    const dto = new FileDto();
    dto.id = file.id;
    dto.name = file.name;
    dto.mimeType = file.mimeType;
    dto.size = Number(file.size);
    dto.folderId = file.folderId;
    dto.uploadedById = file.uploadedById;
    dto.version = file.version;
    dto.createdAt = file.createdAt;
    dto.updatedAt = file.updatedAt;
    return dto;
  }
}
