import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateShareLinkDto {
  @ApiProperty({ example: 'uuid-of-file' })
  @IsUUID()
  fileId: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'TTL в секундах (0 — бессрочно)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ttlSeconds?: number;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Максимальное количество скачиваний',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDownloads?: number;
}
