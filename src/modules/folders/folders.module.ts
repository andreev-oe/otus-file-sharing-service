import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { Folder } from './entities/folder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Folder]), CacheModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
