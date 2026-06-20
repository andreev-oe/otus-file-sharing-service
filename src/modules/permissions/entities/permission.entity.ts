import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  PermissionLevel,
  ResourceType,
  SubjectType,
} from '../../../common/enums';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SubjectType })
  subjectType: SubjectType;

  @Column()
  subjectId: string;

  @Column({ type: 'enum', enum: ResourceType })
  resourceType: ResourceType;

  @Column()
  resourceId: string;

  @Column({ type: 'enum', enum: PermissionLevel })
  permission: PermissionLevel;

  @CreateDateColumn()
  createdAt: Date;
}
