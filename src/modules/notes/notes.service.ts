import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresFkViolation } from '../../common/constants/postgres-error-codes';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

const MENTION_PATTERN = /@(\w+)/g;
const MENTION_CAPTURE_GROUP_INDEX = 1;

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async create(authorId: string, dto: CreateNoteDto): Promise<Note> {
    const note = this.noteRepository.create({
      fileId: dto.fileId,
      authorId,
      content: dto.content,
      mentions: this.extractMentions(dto.content),
    });
    try {
      return await this.noteRepository.save(note);
    } catch (error) {
      if (isPostgresFkViolation(error)) {
        throw new BadRequestException('File not found');
      }
      throw error;
    }
  }

  async findByFile(
    fileId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Note[]; total: number }> {
    const [data, total] = await this.noteRepository.findAndCount({
      where: { fileId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async update(id: string, authorId: string, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOwnedOrFail(id, authorId);
    note.content = dto.content;
    note.mentions = this.extractMentions(dto.content);
    return this.noteRepository.save(note);
  }

  async remove(id: string, authorId: string): Promise<void> {
    await this.findOwnedOrFail(id, authorId);
    await this.noteRepository.delete(id);
  }

  private async findOwnedOrFail(id: string, authorId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.authorId !== authorId) {
      throw new ForbiddenException('You are not the author of this note');
    }
    return note;
  }

  private extractMentions(content: string): string[] {
    const matches = [...content.matchAll(MENTION_PATTERN)];
    const usernames = matches.map((match) => { return match[MENTION_CAPTURE_GROUP_INDEX]; });
    return [...new Set(usernames)];
  }
}
