import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/users/user.service';
import { AuthResponseDto, RefreshAccessResponseDto } from './dto/auth-response.dto';
import { LogoutBodyDto, RefreshTokenBodyDto } from './dto/refresh-token.dto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { getValidatedEnv } from '../config/env.schema';
import { jwtExpiryToMilliseconds } from '../config/jwt-expiry';
import { jwtExpires } from '../config/jwt-types';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.getUserByLogin(loginDto.login);

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.issueTokensForUser(user.id, user.login, user.email);
  }

  async refresh(body: RefreshTokenBodyDto): Promise<RefreshAccessResponseDto> {
    const env = getValidatedEnv();
    let decoded: { sub: number; typ?: string; sid?: string };
    try {
      decoded = await this.jwtService.verifyAsync<{ sub: number; typ?: string; sid?: string }>(
        body.refresh_token,
        { secret: env.jwt.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    if (decoded.typ !== 'refresh' || !decoded.sid) {
      throw new UnauthorizedException('Token de atualização inválido.');
    }

    const row = await this.refreshRepo.findOne({ where: { id: decoded.sid } });
    const now = new Date();
    if (
      !row ||
      row.usuarioId !== decoded.sub ||
      row.revokedAt !== null ||
      row.expiresAt <= now
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    const user = await this.userService.getUserById(decoded.sub);
    const access_token = this.jwtService.sign(
      { sub: user.id, login: user.login, typ: 'access' },
      { expiresIn: jwtExpires(env.jwt.accessExpiresIn) },
    );
    return { access_token };
  }

  async logout(body: LogoutBodyDto): Promise<{ ok: true }> {
    if (!body.refresh_token) return { ok: true };
    const env = getValidatedEnv();
    try {
      const decoded = await this.jwtService.verifyAsync<{ sub: number; typ?: string; sid?: string }>(
        body.refresh_token,
        { secret: env.jwt.refreshSecret },
      );
      if (decoded.typ === 'refresh' && decoded.sid) {
        await this.refreshRepo.update(
          { id: decoded.sid, usuarioId: decoded.sub },
          { revokedAt: new Date() },
        );
      }
    } catch {
      // ignore
    }
    return { ok: true };
  }

  private async issueTokensForUser(
    userId: number,
    login: string,
    email: string,
  ): Promise<AuthResponseDto> {
    const env = getValidatedEnv();
    const sid = randomUUID();
    const refreshMs = jwtExpiryToMilliseconds(env.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + refreshMs);

    await this.refreshRepo.save({
      id: sid,
      usuarioId: userId,
      expiresAt,
      revokedAt: null,
    });

    const refresh_token = this.jwtService.sign(
      { sub: userId, typ: 'refresh', sid },
      {
        secret: env.jwt.refreshSecret,
        expiresIn: jwtExpires(env.jwt.refreshExpiresIn),
      },
    );

    const access_token = this.jwtService.sign(
      { sub: userId, login, typ: 'access' },
      { expiresIn: jwtExpires(env.jwt.accessExpiresIn) },
    );

    return {
      access_token,
      refresh_token,
      user: { id: userId, login, email },
    };
  }
}
