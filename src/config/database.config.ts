import { registerAs } from '@nestjs/config';
import {
  DEFAULT_DB_HOST,
  DEFAULT_DB_NAME,
  DEFAULT_DB_PASSWORD,
  DEFAULT_DB_PORT,
  DEFAULT_DB_USERNAME,
} from './config.consts';

export default registerAs('database', () => {
  return {
    host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
    port: parseInt(process.env.DB_PORT ?? String(DEFAULT_DB_PORT), 10),
    username: process.env.DB_USERNAME ?? DEFAULT_DB_USERNAME,
    password: process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
    database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  };
});
