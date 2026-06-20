import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

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
  enqueue(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    return this.reportsService.enqueue(user.id, dto);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Получить статус задачи генерации отчёта' })
  getStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getStatus(jobId);
  }

  @Get(':jobId/download')
  @ApiOperation({
    summary: 'Получить presigned URL для скачивания готового отчёта',
  })
  getDownloadUrl(@Param('jobId') jobId: string) {
    return this.reportsService.getDownloadUrl(jobId);
  }
}
