import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 10;
const AVATAR_S3_KEY_PREFIX = 'avatars/';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly storageService: StorageService,
  ) {}

  async create(email: string, password: string, name: string): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = this.userRepository.create({ email, passwordHash, name });
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, dto);
    return this.findById(id);
  }

  async uploadAvatar(id: string, file: Express.Multer.File): Promise<User> {
    const key = `${AVATAR_S3_KEY_PREFIX}${id}/${Date.now()}-${file.originalname}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    const avatarUrl = this.storageService.getPublicUrl(key);
    await this.userRepository.update(id, { avatarUrl });
    return this.findById(id);
  }
}
