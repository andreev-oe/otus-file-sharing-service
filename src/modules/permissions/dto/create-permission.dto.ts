import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { PermissionLevel, ResourceType, SubjectType } from '../../../common/enums';

export class CreatePermissionDto {
  @ApiProperty({ enum: SubjectType, example: SubjectType.USER })
  @IsEnum(SubjectType)
  subjectType: SubjectType;

  @ApiProperty({
    example: 'uuid-of-user-or-group',
    description: 'Не требуется для subjectType = everyone',
    required: false,
  })
  @ValidateIf((dto: CreatePermissionDto) => {
    return dto.subjectType !== SubjectType.EVERYONE;
  })
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.FILE })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ example: 'uuid-of-file-or-folder' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ enum: PermissionLevel, example: PermissionLevel.VIEW })
  @IsEnum(PermissionLevel)
  permission: PermissionLevel;
}
