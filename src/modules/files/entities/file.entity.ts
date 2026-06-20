import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Folder } from '../../folders/entities/folder.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  s3Key: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ nullable: true, type: 'uuid' })
  folderId: string | null;

  @ManyToOne(
    () => {
      return Folder;
    },
    { nullable: true },
  )
  folder: Folder | null;

  @Column()
  uploadedById: string;

  @ManyToOne(() => {
    return User;
  })
  uploadedBy: User;

  @Column({ default: 1 })
  version: number;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
