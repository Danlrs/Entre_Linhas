import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  password: string;

  @IsString()
  @IsOptional()
  telefone?: string;
}
