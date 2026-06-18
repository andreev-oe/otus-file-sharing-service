import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateFolderDto {
  @ApiPropertyOptional({ example: 'Новое имя' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-folder', nullable: true })
  @IsOptional()
  @ValidateIf((object: UpdateFolderDto) => {
    return object.parentId !== null;
  })
  @IsUUID()
  parentId?: string | null;
}
