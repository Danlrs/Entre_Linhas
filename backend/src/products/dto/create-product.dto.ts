import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;

  @IsOptional()
  @IsInt()
  ordem?: number;
}

export class ProductSizeDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @MaxLength(50)
  nome: string;

  @IsNumber()
  @Min(0)
  preco: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  profundidade?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  comprimento?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  largura?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  estoque?: number | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsInt()
  ordem?: number;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  available: boolean;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidadeEstampas?: number;

  @IsOptional()
  @IsInt()
  categoriaId?: number | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  estampaIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  materialIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  imagens?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSizeDto)
  tamanhos?: ProductSizeDto[];
}
