import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Get('me')
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto): Promise<User> {
    return this.usersService.update(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> {
    const key = `avatars/${user.id}/${Date.now()}-${file.originalname}`;
    const avatarUrl = await this.storageService.upload(key, file.buffer, file.mimetype);
    return this.usersService.updateAvatar(user.id, avatarUrl);
  }
}
