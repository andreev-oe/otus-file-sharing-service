import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole, SubjectType } from '../../common/enums';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionDto } from './dto/permission.dto';
import { ListPermissionsQueryDto } from './dto/list-permissions.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Список разрешений по субъекту (user/group) или ресурсу (file/folder)',
  })
  @ApiOkResponse({ type: [PermissionDto] })
  async list(
    @CurrentUser() user: User,
    @Query() query: ListPermissionsQueryDto,
  ): Promise<PermissionDto[]> {
    const isAdmin = user.role === UserRole.ADMIN;
    const hasSubjectFilter = query.subjectType !== undefined &&
      (query.subjectId !== undefined || query.subjectType === SubjectType.EVERYONE);
    const hasResourceFilter = query.resourceType !== undefined && query.resourceId !== undefined;

    if (!hasSubjectFilter && !hasResourceFilter) {
      throw new BadRequestException(
        'Укажите фильтр: (subjectType + subjectId) или (resourceType + resourceId)',
      );
    }

    if (!isAdmin) {
      if (!hasSubjectFilter || query.subjectType !== SubjectType.USER || query.subjectId !== user.id) {
        throw new ForbiddenException('Доступ запрещён');
      }
    }

    const permissions = await this.permissionsService.listPermissions(query);
    return permissions.map((permission) => {
      return PermissionDto.fromEntity(permission);
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Выдать права доступа пользователю, группе или всем на файл/папку',
  })
  @ApiCreatedResponse({ type: PermissionDto })
  async grant(
    @CurrentUser() user: User,
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionDto> {
    if (
      dto.subjectType === SubjectType.EVERYONE &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Только системный администратор может выдавать права всем пользователям',
      );
    }
    const permission = await this.permissionsService.grant(dto);
    return PermissionDto.fromEntity(permission);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отозвать ранее выданные права доступа' })
  @ApiNoContentResponse({ description: 'Права отозваны' })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.permissionsService.revoke(id);
  }
}
