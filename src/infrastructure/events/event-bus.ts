import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { FolderCreatedEvent } from './folder-created.event';
import type { FileCreatedEvent } from './file-created.event';
import type { PermissionChangedOnFolderEvent } from './permission-changed-on-folder.event';
import type { CascadePermissionsToFoldersEvent } from './cascade-permissions-to-folders.event';
import type { FileStorageChangedEvent } from './file-storage-changed.event';
import type { UsersMentionedEvent } from './users-mentioned.event';

@Injectable()
export class EventBus {
  readonly folderCreated = new Subject<FolderCreatedEvent>();
  readonly fileCreated = new Subject<FileCreatedEvent>();
  readonly permissionChangedOnFolder =
    new Subject<PermissionChangedOnFolderEvent>();
  readonly cascadePermissionsToFolders =
    new Subject<CascadePermissionsToFoldersEvent>();
  readonly fileStorageChanged = new Subject<FileStorageChangedEvent>();
  readonly usersMentioned = new Subject<UsersMentionedEvent>();
}
