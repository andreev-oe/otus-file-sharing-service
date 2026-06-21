import { ApiProperty } from '@nestjs/swagger';
import { Folder } from '../entities/folder.entity';

export class FolderNameDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Проект 2025' })
  name: string;

  static fromEntity(folder: Folder): FolderNameDto {
    const dto = new FolderNameDto();
    dto.id = folder.id;
    dto.name = folder.name;
    return dto;
  }
}
