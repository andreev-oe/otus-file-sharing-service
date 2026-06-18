import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import smtpConfig from '../../config/smtp.config';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule.forFeature(smtpConfig)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
