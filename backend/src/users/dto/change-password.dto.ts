import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A nova senha deve ter ao menos 6 caracteres.' })
  newPassword: string;
}
