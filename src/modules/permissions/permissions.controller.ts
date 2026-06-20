import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole, SubjectType } from '../../common/enums';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Выдать права доступа пользователю, группе или всем на файл/папку',
  })
  grant(@CurrentUser() user: User, @Body() dto: CreatePermissionDto) {
    if (
      dto.subjectType === SubjectType.EVERYONE &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Только системный администратор может выдавать права всем пользователям',
      );
    }
    return this.permissionsService.grant(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отозвать ранее выданные права доступа' })
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.revoke(id);
  }
}
