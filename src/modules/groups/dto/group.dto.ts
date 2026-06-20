import { ApiProperty } from '@nestjs/swagger';
import { Group } from '../entities/group.entity';

export class GroupDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Команда разработки' })
  name: string;

  @ApiProperty({ example: 'Группа для обмена файлами команды', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  ownerId: string;

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
    dto.createdAt = group.createdAt;
    dto.updatedAt = group.updatedAt;
    return dto;
  }
}
