import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { ShareLinksService } from './share-links.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareLinkDto } from './dto/share-link.dto';
import { DownloadUrlDto } from '../files/dto/download-url.dto';

@ApiTags('ShareLinks')
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Создать публичную ссылку на файл (с TTL, паролем и лимитом скачиваний). Предыдущая активная ссылка для этого файла деактивируется.',
  })
  @ApiCreatedResponse({ type: ShareLinkDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateShareLinkDto,
  ): Promise<ShareLinkDto> {
    const link = await this.shareLinksService.create(user.id, dto);
    return ShareLinkDto.fromEntity(link);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить все активные публичные ссылки текущего пользователя',
  })
  @ApiOkResponse({ type: [ShareLinkDto] })
  async findAllByUser(@CurrentUser() user: User): Promise<ShareLinkDto[]> {
    const links = await this.shareLinksService.findAllByUser(user.id);
    return links.map((link) => {
      return ShareLinkDto.fromEntity(link);
    });
  }

  @Get('file/:fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить активную публичную ссылку для конкретного файла',
  })
  @ApiOkResponse({ type: ShareLinkDto })
  async findByFile(
    @CurrentUser() user: User,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<ShareLinkDto> {
    const link = await this.shareLinksService.findByFile(fileId, user.id);
    if (!link) {
      throw new NotFoundException('No active share link for this file');
    }
    return ShareLinkDto.fromEntity(link);
  }

  @Get(':token')
  @ApiOperation({
    summary: 'Получить метаданные файла по публичной ссылке (с опциональным паролем)',
  })
  @ApiOkResponse({ type: ShareLinkDto })
  async findByToken(
    @Param('token', ParseUUIDPipe) token: string,
    @Query('password') password?: string,
  ): Promise<ShareLinkDto> {
    const link = await this.shareLinksService.findByToken(token, password);
    return ShareLinkDto.fromEntity(link);
  }

  @Get(':token/download')
  @ApiOperation({
    summary: 'Получить presigned URL для скачивания файла по публичной ссылке',
  })
  @ApiOkResponse({ type: DownloadUrlDto })
  getDownloadUrl(
    @Param('token', ParseUUIDPipe) token: string,
    @Query('password') password?: string,
  ): Promise<DownloadUrlDto> {
    return this.shareLinksService.getDownloadUrl(token, password);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Деактивировать публичную ссылку' })
  @ApiNoContentResponse({ description: 'Ссылка деактивирована' })
  deactivate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.shareLinksService.deactivate(id, user.id);
  }
}
