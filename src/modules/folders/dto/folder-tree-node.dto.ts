import { ApiProperty } from '@nestjs/swagger';
import { Folder } from '../entities/folder.entity';

export class FolderTreeNodeDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Документы' })
  name: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  ownerId: string;

  @ApiProperty({ type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  parentId: string | null;

  @ApiProperty({ example: '/uuid1/uuid2' })
  path: string;

  @ApiProperty({ example: 204800 })
  totalSize: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: () => FolderTreeNodeDto, isArray: true })
  children: FolderTreeNodeDto[];

  static fromEntity(
    folder: Folder,
    children: FolderTreeNodeDto[],
  ): FolderTreeNodeDto {
    const node = new FolderTreeNodeDto();
    node.id = folder.id;
    node.name = folder.name;
    node.ownerId = folder.ownerId;
    node.parentId = folder.parentId;
    node.path = folder.path;
    node.totalSize = folder.totalSize;
    node.createdAt = folder.createdAt;
    node.updatedAt = folder.updatedAt;
    node.children = children;
    return node;
  }
}
