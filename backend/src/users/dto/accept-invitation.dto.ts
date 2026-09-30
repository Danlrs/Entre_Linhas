import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_.]{3,50}$/, { message: 'O login deve ter de 3 a 50 caracteres: letras, números, _ ou ponto; sem espaços.' })
  login: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  password: string;

  @IsString()
  @MinLength(8, { message: 'Confirme a senha com ao menos 8 caracteres.' })
  confirmPassword: string;

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Informe um telefone com DDD e 10 ou 11 números.' })
  telefone: string;
}
