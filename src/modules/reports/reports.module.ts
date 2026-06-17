import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { REPORTS_QUEUE, ReportsProcessor } from '../../jobs/reports.processor';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: REPORTS_QUEUE,
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
