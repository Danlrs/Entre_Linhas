import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateEstampaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @IsOptional()
  imagemUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorAdicional?: number;
}
