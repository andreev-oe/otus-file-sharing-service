import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlDto {
  @ApiProperty({ example: 'https://s3.example.com/files/report.pdf?X-Amz-Signature=...' })
  url: string;
}
