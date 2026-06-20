import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { ShareLink } from './entities/share-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShareLink]), StorageModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
