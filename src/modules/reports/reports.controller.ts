import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  enqueue(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    return this.reportsService.enqueue(user.id, dto);
  }

  @Get(':jobId/status')
  getStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getStatus(jobId);
  }

  @Get(':jobId/download')
  getDownloadUrl(@Param('jobId') jobId: string) {
    return this.reportsService.getDownloadUrl(jobId);
  }
}
