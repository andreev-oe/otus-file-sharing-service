import { SetMetadata } from '@nestjs/common';
import { PermissionLevel, ResourceType } from '../enums';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  resourceType: ResourceType;
  level: PermissionLevel;
  paramName: string;
}

export const RequirePermission = (
  resourceType: ResourceType,
  level: PermissionLevel,
  paramName = 'id',
) => {
  return SetMetadata<string, RequiredPermission>(PERMISSION_KEY, { resourceType, level, paramName });
};
