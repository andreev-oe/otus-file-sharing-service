import { registerAs } from '@nestjs/config';
import {
  DEFAULT_APP_PORT,
  DEFAULT_FRONTEND_ORIGIN,
  DEFAULT_NODE_ENV,
} from './config.consts';

export default registerAs('app', () => {
  return {
    port: parseInt(process.env.PORT ?? String(DEFAULT_APP_PORT), 10),
    nodeEnv: process.env.NODE_ENV ?? DEFAULT_NODE_ENV,
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? DEFAULT_FRONTEND_ORIGIN,
  };
});
