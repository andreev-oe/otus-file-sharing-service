export interface FolderCreatedEvent {
  folderId: string;
  ownerId: string;
  parentId: string | null;
}
