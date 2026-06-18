import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import {
  DEFAULT_DB_HOST,
  DEFAULT_DB_NAME,
  DEFAULT_DB_PASSWORD,
  DEFAULT_DB_PORT,
  DEFAULT_DB_USERNAME,
} from './config/config.consts';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
  port: parseInt(process.env.DB_PORT ?? String(DEFAULT_DB_PORT), 10),
  username: process.env.DB_USERNAME ?? DEFAULT_DB_USERNAME,
  password: process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
  database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
