import { registerAs } from '@nestjs/config';

export const DEFAULT_APP_PORT = 3000;

export default registerAs('app', () => {
  return {
    port: parseInt(process.env.PORT ?? String(DEFAULT_APP_PORT), 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
});
