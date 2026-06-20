import { InjectEntityManager } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from 'typeorm';
import { format as formatCsv } from 'fast-csv';
import PDFDocument from 'pdfkit';
import { StorageService } from '../infrastructure/storage/storage.service';
import { File } from '../modules/files/entities/file.entity';
import { Folder } from '../modules/folders/entities/folder.entity';
import { GroupMember } from '../modules/groups/entities/group-member.entity';
import { ReportFormat, ReportType } from '../common/enums';

export const REPORTS_QUEUE = 'reports';

const REPORT_S3_KEY_PREFIX = 'reports';

const PROGRESS_STARTED = 10;
const PROGRESS_DATA_FETCHED = 50;
const PROGRESS_FILE_GENERATED = 80;
const PROGRESS_DONE = 100;

const PDF_MARGIN = 50;
const PDF_TITLE_FONT_SIZE = 18;
const PDF_SUBTITLE_FONT_SIZE = 11;
const PDF_CELL_FONT_SIZE = 10;
const PDF_PAGE_RIGHT_X = 545;
const PDF_SECTION_SPACING = 1.5;
const PDF_ROW_SPACING = 0.5;

export interface ReportJobData {
  userId: string;
  type: ReportType;
  subjectId: string;
  format: ReportFormat;
  from?: string;
  to?: string;
}

export interface ReportJobResult {
  s3Key: string;
}

@Processor(REPORTS_QUEUE)
export class ReportsProcessor extends WorkerHost {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<ReportJobResult> {
    await job.updateProgress(PROGRESS_STARTED);

    const rows = await this.fetchData(job.data);
    await job.updateProgress(PROGRESS_DATA_FETCHED);

    const mimeType =
      job.data.format === ReportFormat.CSV ? 'text/csv' : 'application/pdf';
    const buffer =
      job.data.format === ReportFormat.CSV
        ? await this.generateCsv(rows)
        : await this.generatePdf(job.data, rows);
    await job.updateProgress(PROGRESS_FILE_GENERATED);

    const s3Key = `${REPORT_S3_KEY_PREFIX}/${job.data.userId}/${job.id}.${job.data.format}`;
    await this.storageService.upload(s3Key, buffer, mimeType);
    await job.updateProgress(PROGRESS_DONE);

    return { s3Key };
  }

  private async fetchData(
    data: ReportJobData,
  ): Promise<Record<string, unknown>[]> {
    if (data.type === ReportType.USER) {
      return this.fetchUserReport(data);
    }
    if (data.type === ReportType.FOLDER) {
      return this.fetchFolderReport(data);
    }
    return this.fetchGroupReport(data);
  }

  private async fetchUserReport(
    data: ReportJobData,
  ): Promise<Record<string, unknown>[]> {
    const queryBuilder = this.entityManager
      .createQueryBuilder(File, 'file')
      .where('file.uploadedById = :subjectId', { subjectId: data.subjectId })
      .andWhere('file.isDeleted = false');

    if (data.from) {
      queryBuilder.andWhere('file.createdAt >= :from', { from: data.from });
    }
    if (data.to) {
      queryBuilder.andWhere('file.createdAt <= :to', { to: data.to });
    }

    const files = await queryBuilder.orderBy('file.createdAt', 'ASC').getMany();
    return files.map((file) => {
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        folderId: file.folderId ?? '',
        version: file.version,
        uploadedAt: file.createdAt,
      };
    });
  }

  private async fetchFolderReport(
    data: ReportJobData,
  ): Promise<Record<string, unknown>[]> {
    const folder = await this.entityManager
      .createQueryBuilder(Folder, 'folder')
      .where('folder.id = :id', { id: data.subjectId })
      .andWhere('folder.isDeleted = false')
      .getOne();

    if (!folder) {
      return [];
    }

    const descendants = await this.entityManager
      .createQueryBuilder(Folder, 'folder')
      .select('folder.id')
      .where('folder.path LIKE :pathPrefix', { pathPrefix: `${folder.path}/%` })
      .andWhere('folder.isDeleted = false')
      .getMany();

    const folderIds = [
      data.subjectId,
      ...descendants.map((descendant) => {
        return descendant.id;
      }),
    ];

    const queryBuilder = this.entityManager
      .createQueryBuilder(File, 'file')
      .where('file.folderId IN (:...folderIds)', { folderIds })
      .andWhere('file.isDeleted = false');

    if (data.from) {
      queryBuilder.andWhere('file.createdAt >= :from', { from: data.from });
    }
    if (data.to) {
      queryBuilder.andWhere('file.createdAt <= :to', { to: data.to });
    }

    const files = await queryBuilder.orderBy('file.createdAt', 'ASC').getMany();
    return files.map((file) => {
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        uploadedById: file.uploadedById,
        version: file.version,
        uploadedAt: file.createdAt,
      };
    });
  }

  private async fetchGroupReport(
    data: ReportJobData,
  ): Promise<Record<string, unknown>[]> {
    const members = await this.entityManager
      .createQueryBuilder(GroupMember, 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.groupId = :groupId', { groupId: data.subjectId })
      .orderBy('member.createdAt', 'ASC')
      .getMany();

    return members.map((member) => {
      return {
        userId: member.userId,
        name: member.user?.name ?? '',
        email: member.user?.email ?? '',
        role: member.role,
        joinedAt: member.createdAt,
      };
    });
  }

  private generateCsv(rows: Record<string, unknown>[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (rows.length === 0) {
        resolve(Buffer.alloc(0));
        return;
      }
      const chunks: Buffer[] = [];
      const csvStream = formatCsv({ headers: true });
      csvStream.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      csvStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      csvStream.on('error', reject);
      for (const row of rows) {
        csvStream.write(row);
      }
      csvStream.end();
    });
  }

  private generatePdf(
    jobData: ReportJobData,
    rows: Record<string, unknown>[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ margin: PDF_MARGIN });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      document.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      document.on('error', reject);

      document
        .fontSize(PDF_TITLE_FONT_SIZE)
        .text(`${jobData.type} Report`, { align: 'center' });
      document.moveDown();
      document
        .fontSize(PDF_SUBTITLE_FONT_SIZE)
        .text(`Generated: ${new Date().toISOString()}`);
      document.moveDown(PDF_SECTION_SPACING);

      if (rows.length === 0) {
        document
          .fontSize(PDF_SUBTITLE_FONT_SIZE)
          .text('No data available for the selected period.');
      } else {
        const headers = Object.keys(rows[0]);
        for (const row of rows) {
          for (const header of headers) {
            document
              .fontSize(PDF_CELL_FONT_SIZE)
              .text(`${header}: ${String(row[header] ?? '')}`);
          }
          document.moveDown(PDF_ROW_SPACING);
          document
            .moveTo(PDF_MARGIN, document.y)
            .lineTo(PDF_PAGE_RIGHT_X, document.y)
            .stroke();
          document.moveDown(PDF_ROW_SPACING);
        }
      }

      document.end();
    });
  }
}
