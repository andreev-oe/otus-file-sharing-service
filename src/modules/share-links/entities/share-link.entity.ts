import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { File } from '../../files/entities/file.entity';

@Entity('share_links')
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  token: string;

  @Column()
  fileId: string;

  @ManyToOne(() => {
    return File;
  })
  file: File;

  @Column()
  createdById: string;

  @ManyToOne(() => {
    return User;
  })
  createdBy: User;

  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  passwordHash: string | null;

  @Column({ nullable: true, type: 'int' })
  maxDownloads: number | null;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
