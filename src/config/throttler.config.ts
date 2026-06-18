import { registerAs } from '@nestjs/config';

const DEFAULT_THROTTLE_TTL_MS = 60_000;
const DEFAULT_THROTTLE_LIMIT = 100;

export default registerAs('throttler', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL_MS ?? String(DEFAULT_THROTTLE_TTL_MS), 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? String(DEFAULT_THROTTLE_LIMIT), 10),
}));
