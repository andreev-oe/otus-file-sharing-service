import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupMemberRole } from '../../../common/enums';
import { UserPublicDto } from '../../users/dto/user-public.dto';
import { GroupMember } from '../entities/group-member.entity';

export class GroupMemberDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  groupId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ enum: GroupMemberRole, example: GroupMemberRole.MEMBER })
  role: GroupMemberRole;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ type: () => UserPublicDto })
  user?: UserPublicDto;

  static fromEntity(member: GroupMember): GroupMemberDto {
    const dto = new GroupMemberDto();
    dto.id = member.id;
    dto.groupId = member.groupId;
    dto.userId = member.userId;
    dto.role = member.role;
    dto.createdAt = member.createdAt;
    if (member.user) {
      dto.user = UserPublicDto.fromEntity(member.user);
    }
    return dto;
  }
}
