import { ApiProperty } from '@nestjs/swagger';
import { ReportFormat } from '../../../common/enums';

export class ReportJobDto {
  @ApiProperty({ example: '42' })
  jobId: string;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'waiting', description: 'waiting | active | completed | failed' })
  status: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  requestedById: string;

  @ApiProperty({ enum: ReportFormat, example: ReportFormat.CSV })
  format: ReportFormat;
}

export class ReportStatusDto {
  @ApiProperty({ example: '42' })
  jobId: string;

  @ApiProperty({ example: 'completed', description: 'waiting | active | completed | failed' })
  status: string;

  @ApiProperty({ example: 75, description: 'Прогресс выполнения от 0 до 100' })
  progress: number;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  requestedById: string;

  @ApiProperty({ enum: ReportFormat, example: ReportFormat.CSV })
  format: ReportFormat;
}
