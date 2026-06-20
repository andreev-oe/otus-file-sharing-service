import { ApiProperty } from '@nestjs/swagger';
import { Folder } from '../entities/folder.entity';

export class FolderDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Документы' })
  name: string;

  @ApiProperty({ type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  parentId: string | null;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  ownerId: string;

  @ApiProperty({ example: '/uuid1/uuid2' })
  path: string;

  @ApiProperty({ example: 204800 })
  totalSize: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(folder: Folder): FolderDto {
    const dto = new FolderDto();
    dto.id = folder.id;
    dto.name = folder.name;
    dto.parentId = folder.parentId;
    dto.ownerId = folder.ownerId;
    dto.path = folder.path;
    dto.totalSize = Number(folder.totalSize);
    dto.createdAt = folder.createdAt;
    dto.updatedAt = folder.updatedAt;
    return dto;
  }
}
