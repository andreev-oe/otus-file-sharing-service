import { registerAs } from '@nestjs/config';
import { DEFAULT_THROTTLE_LIMIT, DEFAULT_THROTTLE_TTL_MS } from './config.consts';

export default registerAs('throttler', () => {
  return {
    ttl: parseInt(process.env.THROTTLE_TTL_MS ?? String(DEFAULT_THROTTLE_TTL_MS), 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? String(DEFAULT_THROTTLE_LIMIT), 10),
  };
});
