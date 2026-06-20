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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { UserProfileDto } from './dto/user-profile.dto';
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

  @Get()
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  @ApiOkResponse({ type: [UserPublicDto] })
  async findAll(): Promise<UserPublicDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => {
      return UserPublicDto.fromEntity(user);
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiOkResponse({ type: UserProfileDto })
  getProfile(@CurrentUser() user: User): UserProfileDto {
    return UserProfileDto.fromEntity(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить имя и биографию текущего пользователя' })
  @ApiOkResponse({ type: UserProfileDto })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const updated = await this.usersService.update(user.id, dto);
    return UserProfileDto.fromEntity(updated);
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
  @ApiOkResponse({ type: UserProfileDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfileDto> {
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
    const updated = await this.usersService.uploadAvatar(user.id, file);
    return UserProfileDto.fromEntity(updated);
  }
}
