import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GoogleIdentityService } from './google-identity.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '../users/user.service';
import { getValidatedEnv } from '../config/env.schema';
import { PasswordRecoveryService } from './password-recovery.service';
import { RequestPasswordCodeDto, ResetPasswordDto, VerifyPasswordCodeDto } from './dto/password-recovery.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, RefreshAccessResponseDto } from './dto/auth-response.dto';
import { LogoutBodyDto, RefreshTokenBodyDto } from './dto/refresh-token.dto';

/** Alinhe com os defaults do `EnvSchema` (THROTTLE_LOGIN_*). */
const LOGIN_RATE = { ttl: 60_000, limit: 15 } as const;
const REFRESH_RATE = { ttl: 60_000, limit: 40 } as const;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleIdentity: GoogleIdentityService,
    private readonly users: UserService,
    private readonly recovery: PasswordRecoveryService,
  ) {}

  @Get('google/config')
  googleConfig() {
    const env = getValidatedEnv();
    return { clientId: env.google.clientId };
  }

  @Post('password/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  requestPasswordCode(@Body() body: RequestPasswordCodeDto) {
    return this.recovery.requestCode(body.email);
  }

  @Post('password/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 600_000, limit: 20 } })
  verifyPasswordCode(@Body() body: VerifyPasswordCodeDto) {
    return this.recovery.verifyCode(body.email, body.code);
  }

  @Post('password/reset')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.recovery.resetPassword(body.token, body.password);
  }

  @Post('google')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ...LOGIN_RATE } })
  async googleLogin(@Body() body: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.authService.loginGoogle(await this.googleIdentity.verify(body.credential));
  }

  @Post('google/link')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { ...LOGIN_RATE } })
  async linkGoogle(@Req() req: Request, @Body() body: GoogleLoginDto) {
    const subject = await this.googleIdentity.verify(body.credential);
    return this.users.linkGoogle((req['user'] as { sub: number }).sub, subject);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ...LOGIN_RATE } })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ...REFRESH_RATE } })
  refresh(@Body() body: RefreshTokenBodyDto): Promise<RefreshAccessResponseDto> {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ...REFRESH_RATE } })
  logout(@Body() body: LogoutBodyDto): Promise<{ ok: true }> {
    return this.authService.logout(body);
  }
}
