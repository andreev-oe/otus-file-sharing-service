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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionLevel, ResourceType } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';

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
  upload(
    @CurrentUser() user: User,
    @UploadedFile() uploadedFile: Express.Multer.File,
    @Query('folderId') folderId?: string,
  ) {
    return this.filesService.upload(user.id, uploadedFile, folderId);
  }

  @Get()
  @ApiOperation({
    summary: 'Список файлов текущего пользователя (опционально по папке)',
  })
  findByFolder(
    @CurrentUser() user: User,
    @Query('folderId') folderId?: string,
  ) {
    return this.filesService.findByFolder(folderId ?? null, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск файлов по имени' })
  search(@CurrentUser() user: User, @Query('q') query: string) {
    return this.filesService.search(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить метаданные файла по ID' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findById(id, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Получить presigned URL для скачивания файла' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  getDownloadUrl(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getDownloadUrl(id, user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Получить историю версий файла' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.VIEW)
  getVersions(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getVersions(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Переименовать файл или переместить в другую папку',
  })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.EDIT)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Мягкое удаление файла (помечается как удалённый)' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FILE, PermissionLevel.MANAGE)
  softDelete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.softDelete(id, user.id);
  }
}
