import { ApiProperty } from '@nestjs/swagger';
import { File } from '../entities/file.entity';

export class FileNameDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'report.pdf' })
  name: string;

  static fromEntity(file: File): FileNameDto {
    const dto = new FileNameDto();
    dto.id = file.id;
    dto.name = file.name;
    return dto;
  }
}
