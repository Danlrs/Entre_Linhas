import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tipo?: string;

  @IsString()
  @IsOptional()
  imagemUrl?: string;
}
