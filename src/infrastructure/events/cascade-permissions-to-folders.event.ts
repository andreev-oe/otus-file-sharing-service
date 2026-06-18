import { PermissionLevel, SubjectType } from '../../common/enums';
import { PermissionChangeAction } from './permission-changed-on-folder.event';

export interface CascadePermissionsToFoldersEvent {
  action: PermissionChangeAction;
  folderIds: string[];
  subjectType: SubjectType;
  subjectId: string;
  permissionLevel?: PermissionLevel;
}
