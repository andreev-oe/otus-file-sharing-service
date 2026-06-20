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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionLevel, ResourceType } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderDto } from './dto/folder.dto';
import { FolderTreeNodeDto } from './dto/folder-tree-node.dto';

@ApiTags('Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую папку' })
  @ApiCreatedResponse({ type: FolderDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateFolderDto,
  ): Promise<FolderDto> {
    const folder = await this.foldersService.create(user.id, dto);
    return FolderDto.fromEntity(folder);
  }

  @Get('tree')
  @ApiOperation({
    summary:
      'Получить дерево всех папок пользователя (admin видит все папки системы)',
  })
  @ApiOkResponse({ type: [FolderTreeNodeDto] })
  getTree(@CurrentUser() user: User): Promise<FolderTreeNodeDto[]> {
    return this.foldersService.getTree(user.id, user.role);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск папок по имени' })
  @ApiOkResponse({ type: [FolderDto] })
  async search(
    @CurrentUser() user: User,
    @Query('q') query: string,
  ): Promise<FolderDto[]> {
    const folders = await this.foldersService.search(user.id, query);
    return folders.map((folder) => {
      return FolderDto.fromEntity(folder);
    });
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Получить дочерние папки указанной папки' })
  @ApiOkResponse({ type: [FolderDto] })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.VIEW)
  async getChildren(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderDto[]> {
    const folders = await this.foldersService.getChildFolders(id, user.id);
    return folders.map((folder) => {
      return FolderDto.fromEntity(folder);
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Переименовать папку или переместить в другую папку',
  })
  @ApiOkResponse({ type: FolderDto })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.EDIT)
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ): Promise<FolderDto> {
    const folder = await this.foldersService.update(id, user.id, dto);
    return FolderDto.fromEntity(folder);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Мягкое удаление папки вместе с вложенными папками и файлами',
  })
  @ApiNoContentResponse({ description: 'Папка удалена' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.MANAGE)
  softDelete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.foldersService.softDelete(id, user.id);
  }
}
