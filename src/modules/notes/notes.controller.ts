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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 20;
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateNoteDto) {
    return this.notesService.create(user.id, dto);
  }

  @Get('file/:fileId')
  findByFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('page') page = DEFAULT_PAGE,
    @Query('limit') limit = DEFAULT_PAGE_LIMIT,
  ) {
    return this.notesService.findByFile(fileId, Number(page), Number(limit));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.remove(id, user.id);
  }
}
