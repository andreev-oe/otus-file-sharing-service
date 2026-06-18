import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'document.pdf' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'uuid-of-folder', nullable: true })
  @IsOptional()
  @ValidateIf((object: UpdateFileDto) => {
    return object.folderId !== null;
  })
  @IsUUID()
  folderId?: string | null;
}
