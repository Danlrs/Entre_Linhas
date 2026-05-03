import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenBodyDto {
  @IsString()
  @MinLength(20, { message: 'refresh_token inválido.' })
  refresh_token: string;
}

/** Logout só revoga no servidor quando o refresh é enviado. */
export class LogoutBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'refresh_token inválido.' })
  refresh_token?: string;
}
