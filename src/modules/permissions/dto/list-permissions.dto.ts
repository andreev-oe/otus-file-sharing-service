import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PermissionLevel, ResourceType, SubjectType } from '../../../common/enums';

export class ListPermissionsQueryDto {
  @ApiPropertyOptional({ enum: SubjectType })
  @IsOptional()
  @IsEnum(SubjectType)
  subjectType?: SubjectType;

  @ApiPropertyOptional({ example: 'uuid-of-user-or-group' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional({ example: 'uuid-of-file-or-folder' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({ enum: PermissionLevel })
  @IsOptional()
  @IsEnum(PermissionLevel)
  permission?: PermissionLevel;
}
