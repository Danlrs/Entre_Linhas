import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { Produto } from '../entities/produto.entity';
import { Categoria } from '../entities/categoria.entity';
import { Estampa } from '../entities/estampa.entity';
import { Material } from '../entities/material.entity';
import { ImagemProduto } from '../entities/imagem-produto.entity';
import { ProdutoTamanho } from '../entities/produto-tamanho.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Produto,
      Categoria,
      Estampa,
      Material,
      ImagemProduto,
      ProdutoTamanho,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
