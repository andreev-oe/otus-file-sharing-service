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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionLevel, ResourceType } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@ApiTags('Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую папку' })
  create(@CurrentUser() user: User, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Get('tree')
  @ApiOperation({
    summary:
      'Получить дерево всех папок пользователя (admin видит все папки системы)',
  })
  getTree(@CurrentUser() user: User) {
    return this.foldersService.getTree(user.id, user.role);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск папок по имени' })
  search(@CurrentUser() user: User, @Query('q') query: string) {
    return this.foldersService.search(user.id, query);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Получить дочерние папки указанной папки' })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.VIEW)
  getChildren(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.foldersService.getChildFolders(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Переименовать папку или переместить в другую папку',
  })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.EDIT)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Мягкое удаление папки вместе с вложенными папками и файлами',
  })
  @UseGuards(PermissionsGuard)
  @RequirePermission(ResourceType.FOLDER, PermissionLevel.MANAGE)
  softDelete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.foldersService.softDelete(id, user.id);
  }
}
