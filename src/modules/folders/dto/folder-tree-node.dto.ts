import { Folder } from '../entities/folder.entity';

export class FolderTreeNodeDto {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  path: string;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
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
