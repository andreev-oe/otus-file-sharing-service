import { ApiProperty } from '@nestjs/swagger';
import { PermissionLevel, ResourceType, SubjectType } from '../../../common/enums';
import { Permission } from '../entities/permission.entity';

export class PermissionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ enum: SubjectType, example: SubjectType.USER })
  subjectType: SubjectType;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  subjectId: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.FILE })
  resourceType: ResourceType;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  resourceId: string;

  @ApiProperty({ enum: PermissionLevel, example: PermissionLevel.VIEW })
  permission: PermissionLevel;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  static fromEntity(permission: Permission): PermissionDto {
    const dto = new PermissionDto();
    dto.id = permission.id;
    dto.subjectType = permission.subjectType;
    dto.subjectId = permission.subjectId;
    dto.resourceType = permission.resourceType;
    dto.resourceId = permission.resourceId;
    dto.permission = permission.permission;
    dto.createdAt = permission.createdAt;
    return dto;
  }
}
