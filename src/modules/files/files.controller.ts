import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionLevel, ResourceType, UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileDto } from './dto/file.dto';
import { DownloadUrlDto } from './dto/download-url.dto';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Загрузить файл (multipart/form-data, максимум 100 МБ)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiCreatedResponse({ type: FileDto })
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() uploadedFile: Express.Multer.File,
    @Query('folderId') folderId?: string,
  ): Promise<FileDto> {
    const file = await this.filesService.upload(user.id, uploadedFile, folderId);
    return FileDto.fromEntity(file);
  }

  @Get()
  @ApiOperation({
    summary: 'Список файлов текущего пользователя (опционально по папке)',
  })
  @ApiOkResponse({ type: [FileDto] })
  async findByFolder(
    @CurrentUser() user: User,
    @Query('folderId') folderId?: string,
  ): Promise<FileDto[]> {
    const files = await this.filesService.findByFolder(
      folderId ?? null,
      user.id,
      user.role === UserRole.ADMIN,
    );
    return files.map((file) => {
      return FileDto.fromEntity(file);
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск файлов по имени' })
  @ApiOkResponse({ type: [FileDto] })
  async search(
    @CurrentUser() user: User,
    @Query('q') query: string,
  ): Promise<FileDto[]> {
    const files = await this.filesService.search(user.id, query, user.role === UserRole.ADMIN);
    return files.map((file) => {
      return FileDto.fromEntity(file);
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить метаданные файла по ID' })
  @ApiOkResponse({ type: FileDto })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileDto> {
    const file = await this.filesService.findById(id, user.id, user.role === UserRole.ADMIN);
    return FileDto.fromEntity(file);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Получить presigned URL для скачивания файла' })
  @ApiOkResponse({ type: DownloadUrlDto })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  getDownloadUrl(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DownloadUrlDto> {
    return this.filesService.getDownloadUrl(
      id,
      user.id,
      user.role === UserRole.ADMIN,
    );
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Получить историю версий файла' })
  @ApiOkResponse({ type: [FileDto] })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  async getVersions(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileDto[]> {
    const files = await this.filesService.getVersions(
      id,
      user.id,
      user.role === UserRole.ADMIN,
    );
    return files.map((file) => {
      return FileDto.fromEntity(file);
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Переименовать файл или переместить в другую папку',
  })
  @ApiOkResponse({ type: FileDto })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.EDIT)
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFileDto,
  ): Promise<FileDto> {
    const file = await this.filesService.update(id, user.id, user.role === UserRole.ADMIN, dto);
    return FileDto.fromEntity(file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Мягкое удаление файла (помечается как удалённый)' })
  @ApiNoContentResponse({ description: 'Файл удалён' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.MANAGE)
  softDelete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.filesService.softDelete(
      id,
      user.id,
      user.role === UserRole.ADMIN,
    );
  }
}
