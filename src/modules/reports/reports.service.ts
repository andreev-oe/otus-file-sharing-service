import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageService } from '../../infrastructure/storage/storage.service';
import {
  REPORTS_QUEUE,
  ReportJobData,
  ReportJobResult,
} from '../../jobs/reports.processor';
import { CreateReportDto } from './dto/create-report.dto';

const REPORT_PRESIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class ReportsService {
  constructor(
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  async enqueue(userId: string, dto: CreateReportDto): Promise<{ jobId: string }> {
    const jobData: ReportJobData = {
      userId,
      type: dto.type,
      subjectId: dto.subjectId,
      format: dto.format,
      from: dto.from,
      to: dto.to,
    };
    const job = await this.reportsQueue.add('generate', jobData);
    return { jobId: job.id! };
  }

  async getStatus(jobId: string): Promise<{ status: string; progress: number }> {
    const job = await this.reportsQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const status = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;
    return { status, progress };
  }

  async getDownloadUrl(jobId: string): Promise<{ url: string }> {
    const job = await this.reportsQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const status = await job.getState();
    if (status !== 'completed') {
      throw new BadRequestException('Report is not ready yet');
    }
    const result = job.returnvalue as ReportJobResult;
    const url = await this.storageService.getPresignedUrl(
      result.s3Key,
      REPORT_PRESIGNED_URL_TTL_SECONDS,
    );
    return { url };
  }
}
