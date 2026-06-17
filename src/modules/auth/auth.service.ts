import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { REDIS } from '../cache/redis.provider';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user.id);
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; jti: string; type: string };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException();
    }

    const stored = await this.redis.get(`refresh:${payload.jti}`);
    if (!stored) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    await this.redis.del(`refresh:${payload.jti}`);
    return this.issueTokenPair(payload.sub);
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(token) as { jti?: string } | null;
      if (payload?.jti) {
        await this.redis.del(`refresh:${payload.jti}`);
      }
    } catch {
      // malformed token — nothing to revoke
    }
  }

  private async issueTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();
    const secret = this.config.get<string>('jwt.secret');

    const accessToken = this.jwtService.sign(
      { sub: userId },
      { secret, expiresIn: this.config.get('jwt.accessExpiresIn', '15m') as any },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti, type: 'refresh' },
      { secret, expiresIn: this.config.get('jwt.refreshExpiresIn', '7d') as any },
    );

    await this.redis.set(`refresh:${jti}`, userId, 'EX', REFRESH_TTL_SECONDS);

    return { accessToken, refreshToken };
  }
}
