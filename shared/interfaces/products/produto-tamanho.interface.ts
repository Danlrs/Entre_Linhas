export interface ProdutoTamanho {
  id?: number;
  nome: string;
  preco: number;
  profundidade?: number | null;
  comprimento?: number | null;
  largura?: number | null;
  estoque?: number | null;
  ativo?: boolean;
  ordem?: number;
}

export type ProdutoTamanhoPayload = ProdutoTamanho;
