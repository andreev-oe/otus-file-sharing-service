import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { Queue } from 'bullmq';
import redisConfig from '../../config/redis.config';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CLEANUP_QUEUE, CleanupProcessor } from '../../jobs/cleanup.processor';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    StorageModule,
    ConfigModule.forFeature(redisConfig),
    BullModule.registerQueueAsync({
      name: CLEANUP_QUEUE,
      useFactory: (redisConfiguration: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: redisConfiguration.host,
          port: redisConfiguration.port,
          password: redisConfiguration.password,
        },
      }),
      inject: [redisConfig.KEY],
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, CleanupProcessor],
  exports: [FilesService],
})
export class FilesModule implements OnModuleInit {
  constructor(@InjectQueue(CLEANUP_QUEUE) private readonly cleanupQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.cleanupQueue.add('cleanup', {}, { repeat: { every: CLEANUP_INTERVAL_MS } });
  }
}
