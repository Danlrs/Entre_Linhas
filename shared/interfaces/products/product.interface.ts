import { Categoria } from './categoria.interface';
import { Estampa } from './estampa.interface';
import { Material } from './material.interface';
import { ProdutoTamanho } from './produto-tamanho.interface';

export interface ImagemProduto {
  id?: number;
  url: string;
  principal?: boolean;
  ordem?: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  available: boolean;
  image?: string | null;
  descricao?: string | null;
  categoriaId?: number | null;
  categoria?: Categoria | null;
  estampas?: Estampa[];
  materiais?: Material[];
  imagens?: ImagemProduto[];
  tamanhos?: ProdutoTamanho[];
  quantidadeEstampas?: number;
}

export interface ProductPayload {
  name: string;
  price: number;
  available: boolean;
  image?: string | null;
  descricao?: string | null;
  categoriaId?: number | null;
  estampaIds?: number[];
  materialIds?: number[];
  imagens?: ImagemProduto[];
  tamanhos?: ProdutoTamanho[];
  quantidadeEstampas?: number;
}

export interface ProductSaveEvent {
  editingId: number | null;
  payload: ProductPayload;
}
