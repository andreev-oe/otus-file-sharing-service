import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import jwtConfig from '../../config/jwt.config';
import { REDIS } from '../../infrastructure/cache/redis.provider';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REDIS_REFRESH_TOKEN_KEY_PREFIX = 'refresh:';
const REFRESH_TOKEN_TYPE = 'refresh';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    await this.usersService.create(dto.email, dto.password, dto.name);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user.id);
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.jwtConfiguration.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== REFRESH_TOKEN_TYPE) {
      throw new UnauthorizedException();
    }

    const storedUserId = await this.redis.get(`${REDIS_REFRESH_TOKEN_KEY_PREFIX}${payload.jti}`);
    if (!storedUserId) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    await this.redis.del(`${REDIS_REFRESH_TOKEN_KEY_PREFIX}${payload.jti}`);
    return this.issueTokenPair(payload.sub);
  }

  async logout(token: string): Promise<void> {
    const payload = this.jwtService.decode<RefreshTokenPayload>(token);
    if (payload?.jti) {
      await this.redis.del(`${REDIS_REFRESH_TOKEN_KEY_PREFIX}${payload.jti}`);
    }
  }

  private async issueTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();
    const { secret, accessExpiresInSeconds, refreshExpiresInSeconds } = this.jwtConfiguration;

    const accessToken = this.jwtService.sign(
      { sub: userId },
      { secret, expiresIn: accessExpiresInSeconds },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti, type: REFRESH_TOKEN_TYPE },
      { secret, expiresIn: refreshExpiresInSeconds },
    );

    await this.redis.set(
      `${REDIS_REFRESH_TOKEN_KEY_PREFIX}${jti}`,
      userId,
      'EX',
      refreshExpiresInSeconds,
    );

    return { accessToken, refreshToken };
  }
}
