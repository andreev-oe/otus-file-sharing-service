import { ApiProperty } from '@nestjs/swagger';

export class ReportJobDto {
  @ApiProperty({ example: '42' })
  jobId: string;
}

export class ReportStatusDto {
  @ApiProperty({ example: 'completed', description: 'waiting | active | completed | failed' })
  status: string;

  @ApiProperty({ example: 75, description: 'Прогресс выполнения от 0 до 100' })
  progress: number;
}
