import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';
import { User } from '../entities/user.entity';

export class UserProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Иван Иванов' })
  name: string;

  @ApiProperty({ example: 'ivan_ivanov' })
  username: string;

  @ApiProperty({ example: 'Разработчик из Москвы', nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(user: User): UserProfileDto {
    const dto = new UserProfileDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.username = user.username;
    dto.bio = user.bio;
    dto.avatarUrl = user.avatarUrl;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
