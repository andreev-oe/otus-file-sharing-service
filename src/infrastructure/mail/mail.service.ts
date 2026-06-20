import { Inject, Injectable } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import smtpConfig from '../../config/smtp.config';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(
    @Inject(smtpConfig.KEY)
    private readonly smtpConfiguration: ConfigType<typeof smtpConfig>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.transporter = createTransport({
      host: smtpConfiguration.host,
      port: smtpConfiguration.port,
      auth: {
        user: smtpConfiguration.user,
        pass: smtpConfiguration.password,
      },
    });
  }

  async sendMentionNotification(
    toEmail: string,
    toName: string,
    authorName: string,
    noteId: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.smtpConfiguration.from,
        to: toEmail,
        subject: `${authorName} упомянул вас в заметке`,
        text: `Здравствуйте, ${toName}!\n\n${authorName} упомянул вас в заметке (ID: ${noteId}).\n\nС уважением,\nFileShare`,
        html: `<p>Здравствуйте, <strong>${toName}</strong>!</p><p><strong>${authorName}</strong> упомянул вас в заметке (ID: <code>${noteId}</code>).</p><p>С уважением,<br>FileShare</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send mention notification to ${toEmail}: ${String(error)}`,
      );
    }
  }
}
