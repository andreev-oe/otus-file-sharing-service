import { InjectEntityManager } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from 'typeorm';
import { StorageService } from '../infrastructure/storage/storage.service';
import { File } from '../modules/files/entities/file.entity';

export const CLEANUP_QUEUE = 'cleanup';

const CLEANUP_BATCH_SIZE = 100;

@Processor(CLEANUP_QUEUE)
export class CleanupProcessor extends WorkerHost {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const deletedFiles = await this.entityManager
      .createQueryBuilder(File, 'file')
      .where('file.isDeleted = true')
      .take(CLEANUP_BATCH_SIZE)
      .getMany();

    for (const file of deletedFiles) {
      await this.storageService.delete(file.s3Key);
      await this.entityManager.delete(File, file.id);
    }
  }
}
