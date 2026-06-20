import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ShareLinksService } from './share-links.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';

@ApiTags('ShareLinks')
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Создать публичную ссылку на файл (с TTL, паролем и лимитом скачиваний)',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateShareLinkDto) {
    return this.shareLinksService.create(user.id, dto);
  }

  @Get(':token')
  @ApiOperation({
    summary: 'Получить файл по публичной ссылке (с опциональным паролем)',
  })
  findByToken(
    @Param('token', ParseUUIDPipe) token: string,
    @Query('password') password?: string,
  ) {
    return this.shareLinksService.findByToken(token, password);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Деактивировать публичную ссылку' })
  deactivate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shareLinksService.deactivate(id, user.id);
  }
}
