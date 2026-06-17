import { registerAs } from '@nestjs/config';

export const DEFAULT_DB_HOST = 'localhost';
export const DEFAULT_DB_PORT = 5432;
export const DEFAULT_DB_USERNAME = 'postgres';
export const DEFAULT_DB_PASSWORD = 'postgres';
export const DEFAULT_DB_NAME = 'fileshare';

export default registerAs('database', () => {
  return {
    host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
    port: parseInt(process.env.DB_PORT ?? String(DEFAULT_DB_PORT), 10),
    username: process.env.DB_USERNAME ?? DEFAULT_DB_USERNAME,
    password: process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
    database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  };
});
