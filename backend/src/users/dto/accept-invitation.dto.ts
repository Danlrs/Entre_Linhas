import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._-]{3,50}$/, { message: 'O login deve ter de 3 a 50 caracteres: letras, números, ponto, hífen ou sublinhado.' })
  login: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  password: string;

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Informe um telefone com DDD e 10 ou 11 números.' })
  telefone: string;
}
