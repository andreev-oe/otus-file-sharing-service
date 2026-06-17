import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

export const RedisProvider: Provider = {
  provide: REDIS,
  useFactory: (config: ConfigService): Redis => {
    return new Redis({
      host: config.get<string>('redis.host', 'localhost'),
      port: config.get<number>('redis.port', 6379),
      password: config.get<string>('redis.password'),
    });
  },
  inject: [ConfigService],
};
