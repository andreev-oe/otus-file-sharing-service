import { ApiProperty } from '@nestjs/swagger';
import { Note } from '../entities/note.entity';

export class NoteDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  fileId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  authorId: string;

  @ApiProperty({ example: 'Please review the auth section @bob' })
  content: string;

  @ApiProperty({ example: ['bob', 'carol'], type: [String] })
  mentions: string[];

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(note: Note): NoteDto {
    const dto = new NoteDto();
    dto.id = note.id;
    dto.fileId = note.fileId;
    dto.authorId = note.authorId;
    dto.content = note.content;
    dto.mentions = note.mentions;
    dto.createdAt = note.createdAt;
    dto.updatedAt = note.updatedAt;
    return dto;
  }
}

export class PaginatedNotesDto {
  @ApiProperty({ type: [NoteDto] })
  data: NoteDto[];

  @ApiProperty({ example: 42 })
  total: number;

  static fromResult(result: { data: Note[]; total: number }): PaginatedNotesDto {
    const dto = new PaginatedNotesDto();
    dto.data = result.data.map((note) => {
      return NoteDto.fromEntity(note);
    });
    dto.total = result.total;
    return dto;
  }
}
