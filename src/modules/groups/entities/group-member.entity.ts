import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GroupMemberRole } from '../../../common/enums';
import { Group } from './group.entity';
import { User } from '../../users/entities/user.entity';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @ManyToOne(() => Group, (group) => group.members)
  group: Group;

  @Column()
  userId: string;

  @ManyToOne(() => {
    return User;
  })
  user: User;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
    default: GroupMemberRole.MEMBER,
  })
  role: GroupMemberRole;

  @CreateDateColumn()
  createdAt: Date;
}
