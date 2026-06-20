import {
  BadRequestException,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить имя и биографию текущего пользователя' })
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(user.id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Загрузить аватар текущего пользователя' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP and GIF images are allowed',
      );
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 5 MB');
    }
    return this.usersService.uploadAvatar(user.id, file);
  }
}
