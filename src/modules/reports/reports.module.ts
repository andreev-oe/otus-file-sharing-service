import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigType } from '@nestjs/config';
import redisConfig from '../../config/redis.config';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { REPORTS_QUEUE, ReportsProcessor } from '../../jobs/reports.processor';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    BullModule.registerQueueAsync({
      name: REPORTS_QUEUE,
      useFactory: (redisConfiguration: ConfigType<typeof redisConfig>) => {
        return {
          connection: {
            host: redisConfiguration.host,
            port: redisConfiguration.port,
            password: redisConfiguration.password,
          },
        };
      },
      inject: [redisConfig.KEY],
    }),
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
