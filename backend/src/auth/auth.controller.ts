import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  constructor(private readonly authService: AuthService) {}

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
