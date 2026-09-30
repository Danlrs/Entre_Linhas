import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_.]{3,50}$/, { message: 'O login deve ter de 3 a 50 caracteres: letras, números, _ ou ponto; sem espaços.' })
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  password: string;

  @IsString()
  @IsOptional()
  telefone?: string;
}
