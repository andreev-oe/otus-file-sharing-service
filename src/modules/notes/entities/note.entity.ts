import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { File } from '../../files/entities/file.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @ManyToOne(() => {
    return File;
  })
  file: File;

  @Column()
  authorId: string;

  @ManyToOne(() => {
    return User;
  })
  author: User;

  @Column('text')
  content: string;

  @Column('text', { array: true, default: '{}' })
  mentions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
