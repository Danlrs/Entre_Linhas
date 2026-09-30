import { IsEmail, IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string | null;
}
