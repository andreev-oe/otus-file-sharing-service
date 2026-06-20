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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 20;
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteDto, PaginatedNotesDto } from './dto/note.dto';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать заметку к файлу' })
  @ApiOkResponse({ type: NoteDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateNoteDto,
  ): Promise<NoteDto> {
    const note = await this.notesService.create(user.id, dto);
    return NoteDto.fromEntity(note);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск заметок по содержимому (полнотекстовый)' })
  @ApiOkResponse({ type: [NoteDto] })
  async search(
    @CurrentUser() user: User,
    @Query('q') query: string,
  ): Promise<NoteDto[]> {
    const notes = await this.notesService.search(user.id, query);
    return notes.map((note) => {
      return NoteDto.fromEntity(note);
    });
  }

  @Get('file/:fileId')
  @ApiOperation({ summary: 'Получить заметки к файлу с пагинацией' })
  @ApiOkResponse({ type: PaginatedNotesDto })
  async findByFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('page') page = DEFAULT_PAGE,
    @Query('limit') limit = DEFAULT_PAGE_LIMIT,
  ): Promise<PaginatedNotesDto> {
    const result = await this.notesService.findByFile(fileId, Number(page), Number(limit));
    return PaginatedNotesDto.fromResult(result);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить текст заметки' })
  @ApiOkResponse({ type: NoteDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteDto> {
    const note = await this.notesService.update(id, user.id, dto);
    return NoteDto.fromEntity(note);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить заметку' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.remove(id, user.id);
  }
}
