import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Group } from '../entities/group.entity';
import { UserPublicDto } from '../../users/dto/user-public.dto';

export class GroupDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Команда разработки' })
  name: string;

  @ApiProperty({ type: 'string', example: 'Группа для обмена файлами команды', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  ownerId: string;

  @ApiPropertyOptional({ type: () => UserPublicDto })
  owner?: UserPublicDto;

  @ApiProperty({ example: 5 })
  memberCount: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(group: Group): GroupDto {
    const dto = new GroupDto();
    dto.id = group.id;
    dto.name = group.name;
    dto.description = group.description;
    dto.ownerId = group.ownerId;
    dto.memberCount = group.memberCount ?? 0;
    dto.createdAt = group.createdAt;
    dto.updatedAt = group.updatedAt;
    if (group.owner) {
      dto.owner = UserPublicDto.fromEntity(group.owner);
    }
    return dto;
  }
}
