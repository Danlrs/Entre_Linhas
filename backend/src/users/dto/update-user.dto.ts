import { IsEmail, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O login deve ter ao menos 3 caracteres.' })
  @MaxLength(50)
  login?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string | null;
}
