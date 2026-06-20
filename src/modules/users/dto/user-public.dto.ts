import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserPublicDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Alice Ivanova' })
  name: string;

  @ApiProperty({ example: 'alice' })
  username: string;

  @ApiProperty({ type: 'string', example: 'Backend engineer', nullable: true })
  bio: string | null;

  @ApiProperty({ type: 'string', example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  static fromEntity(user: User): UserPublicDto {
    const dto = new UserPublicDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.username = user.username;
    dto.bio = user.bio;
    dto.avatarUrl = user.avatarUrl;
    return dto;
  }
}
