import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permission } from './entities/permission.entity';
import { GroupMember } from '../groups/entities/group-member.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, GroupMember]),
    CacheModule,
    EventsModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
