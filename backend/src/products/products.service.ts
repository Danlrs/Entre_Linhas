import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Produto } from '../entities/produto.entity';
import { Categoria } from '../entities/categoria.entity';
import { Estampa } from '../entities/estampa.entity';
import { Material } from '../entities/material.entity';
import { ImagemProduto } from '../entities/imagem-produto.entity';
import { ProdutoTamanho } from '../entities/produto-tamanho.entity';
import { CreateProductDto, ProductSizeDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Produto)
    private readonly produtoRepository: Repository<Produto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    @InjectRepository(Estampa)
    private readonly estampaRepository: Repository<Estampa>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(ImagemProduto)
    private readonly imagemRepository: Repository<ImagemProduto>,
    @InjectRepository(ProdutoTamanho)
    private readonly tamanhoRepository: Repository<ProdutoTamanho>,
  ) {}

  async getAllProducts(): Promise<Produto[]> {
    return this.produtoRepository.find({ order: { id: 'ASC' } });
  }

  async getProductById(id: number): Promise<Produto> {
    const product = await this.produtoRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async createProduct(dto: CreateProductDto): Promise<Produto> {
    const produto = new Produto();
    await this.applyDtoToEntity(produto, dto);
    const saved = await this.produtoRepository.save(produto);
    return this.getProductById(saved.id);
  }

  async updateProduct(id: number, dto: UpdateProductDto): Promise<Produto> {
    const produto = await this.getProductById(id);
    await this.applyDtoToEntity(produto, dto);

    if (dto.imagens !== undefined) {
      await this.imagemRepository.delete({ produtoId: id });
      produto.imagens = (dto.imagens ?? []).map((img, idx) =>
        this.imagemRepository.create({
          url: img.url,
          principal: img.principal ?? false,
          ordem: img.ordem ?? idx,
        }),
      );
    }

    if (dto.tamanhos !== undefined) {
      await this.tamanhoRepository.delete({ produtoId: id });
      produto.tamanhos = this.buildTamanhos(dto.tamanhos ?? []);
    }

    const saved = await this.produtoRepository.save(produto);
    return this.getProductById(saved.id);
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    const product = await this.getProductById(id);
    await this.produtoRepository.remove(product);
    return { message: 'Produto removido com sucesso!' };
  }

  private async applyDtoToEntity(
    produto: Produto,
    dto: CreateProductDto | UpdateProductDto,
  ): Promise<void> {
    if (dto.name !== undefined) produto.name = dto.name;
    if (dto.price !== undefined) produto.price = dto.price;
    if (dto.available !== undefined) produto.available = dto.available;
    if (dto.descricao !== undefined) produto.descricao = dto.descricao ?? null;
    if (dto.image !== undefined) produto.image = dto.image ?? null;
    if (dto.quantidadeEstampas !== undefined)
      produto.quantidadeEstampas = Math.max(1, Math.floor(dto.quantidadeEstampas));

    if (dto.categoriaId !== undefined) {
      if (dto.categoriaId === null) {
        produto.categoria = null;
        produto.categoriaId = null;
      } else {
        const categoria = await this.categoriaRepository.findOne({
          where: { id: dto.categoriaId },
        });
        if (!categoria) throw new NotFoundException('Categoria não encontrada.');
        produto.categoria = categoria;
        produto.categoriaId = categoria.id;
      }
    }

    if (dto.estampaIds !== undefined) {
      produto.estampas = dto.estampaIds.length
        ? await this.estampaRepository.find({ where: { id: In(dto.estampaIds) } })
        : [];
    }

    if (dto.materialIds !== undefined) {
      produto.materiais = dto.materialIds.length
        ? await this.materialRepository.find({ where: { id: In(dto.materialIds) } })
        : [];
    }

    if (dto.imagens !== undefined && !produto.id) {
      produto.imagens = dto.imagens.map((img, idx) =>
        this.imagemRepository.create({
          url: img.url,
          principal: img.principal ?? false,
          ordem: img.ordem ?? idx,
        }),
      );

      if (!produto.image) {
        const principal = dto.imagens.find((i) => i.principal) ?? dto.imagens[0];
        if (principal) produto.image = principal.url;
      }
    }

    if (dto.tamanhos !== undefined && !produto.id) {
      produto.tamanhos = this.buildTamanhos(dto.tamanhos);
    }
  }

  private buildTamanhos(items: ProductSizeDto[]): ProdutoTamanho[] {
    return items.map((item, idx) =>
      this.tamanhoRepository.create({
        nome: item.nome,
        preco: item.preco ?? 0,
        profundidade: item.profundidade ?? null,
        comprimento: item.comprimento ?? null,
        largura: item.largura ?? null,
        estoque: item.estoque ?? null,
        ativo: item.ativo ?? true,
        ordem: item.ordem ?? idx,
      }),
    );
  }
}
