import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../../infrastructure/events/events.module';
import { MailModule } from '../../infrastructure/mail/mail.module';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), EventsModule, MailModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
