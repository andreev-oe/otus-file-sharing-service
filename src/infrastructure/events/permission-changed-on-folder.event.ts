import { PermissionLevel, SubjectType } from '../../common/enums';

export enum PermissionChangeAction {
  GRANT = 'grant',
  REVOKE = 'revoke',
}

export interface PermissionChangedOnFolderEvent {
  action: PermissionChangeAction;
  folderId: string;
  subjectType: SubjectType;
  subjectId: string;
  permissionLevel?: PermissionLevel;
}
