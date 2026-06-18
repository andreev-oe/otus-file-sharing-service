import { registerAs } from '@nestjs/config';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  DEFAULT_JWT_SECRET,
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from './config.consts';

export default registerAs('jwt', () => {
  return {
    secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
    accessExpiresInSeconds: parseInt(
      process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? String(DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS),
      10,
    ),
    refreshExpiresInSeconds: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? String(DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS),
      10,
    ),
  };
});
