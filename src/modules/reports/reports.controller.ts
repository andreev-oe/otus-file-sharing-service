import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportJobDto, ReportStatusDto } from './dto/report-job.dto';
import { DownloadUrlDto } from '../files/dto/download-url.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Поставить задачу генерации отчёта в очередь (CSV или PDF)',
  })
  @ApiCreatedResponse({ type: ReportJobDto })
  enqueue(
    @CurrentUser() user: User,
    @Body() dto: CreateReportDto,
  ): Promise<ReportJobDto> {
    return this.reportsService.enqueue(user.id, dto);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Получить статус задачи генерации отчёта' })
  @ApiOkResponse({ type: ReportStatusDto })
  getStatus(@Param('jobId') jobId: string): Promise<ReportStatusDto> {
    return this.reportsService.getStatus(jobId);
  }

  @Get(':jobId/download')
  @ApiOperation({
    summary: 'Получить presigned URL для скачивания готового отчёта',
  })
  @ApiOkResponse({ type: DownloadUrlDto })
  getDownloadUrl(@Param('jobId') jobId: string): Promise<DownloadUrlDto> {
    return this.reportsService.getDownloadUrl(jobId);
  }
}
