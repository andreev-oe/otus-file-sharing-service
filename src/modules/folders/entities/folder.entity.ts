import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'uuid' })
  parentId: string | null;

  @Column()
  ownerId: string;

  @ManyToOne(() => User)
  owner: User;

  @Column()
  path: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ name: 'total_size', type: 'bigint', default: 0 })
  totalSize: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
