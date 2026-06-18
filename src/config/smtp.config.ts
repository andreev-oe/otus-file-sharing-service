import { registerAs } from '@nestjs/config';
import { DEFAULT_SMTP_FROM, DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT } from './config.consts';

export default registerAs('smtp', () => ({
  host: process.env.SMTP_HOST ?? DEFAULT_SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? String(DEFAULT_SMTP_PORT), 10),
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  from: process.env.SMTP_FROM ?? DEFAULT_SMTP_FROM,
}));
