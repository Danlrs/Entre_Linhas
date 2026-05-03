import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { Estampa } from './estampa.entity';
import { Material } from './material.entity';
import { ImagemProduto } from './imagem-produto.entity';
import { ProdutoTamanho } from './produto-tamanho.entity';
import { decimalTransformer } from './decimal.transformer';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'categoria_id', nullable: true })
  categoriaId: number | null;

  @Column({ name: 'nome', length: 150 })
  name: string;

  @Column({ name: 'descricao', type: 'text', nullable: true })
  descricao: string | null;

  @Column({
    name: 'preco',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({ name: 'quantidade_estampas', type: 'int', default: 1 })
  quantidadeEstampas: number;

  @Column({ name: 'imagem_url', type: 'text', nullable: true })
  image: string | null;

  @Column({ name: 'ativo', default: true })
  available: boolean;

  @CreateDateColumn({ name: 'data_cadastro' })
  dataCadastro: Date;

  @ManyToOne(() => Categoria, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria | null;

  @ManyToMany(() => Estampa, { eager: true, cascade: false })
  @JoinTable({
    name: 'produto_estampas',
    joinColumn: { name: 'produto_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'estampa_id', referencedColumnName: 'id' },
  })
  estampas: Estampa[];

  @ManyToMany(() => Material, { eager: true, cascade: false })
  @JoinTable({
    name: 'produto_materiais',
    joinColumn: { name: 'produto_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'material_id', referencedColumnName: 'id' },
  })
  materiais: Material[];

  @OneToMany(() => ImagemProduto, (imagem) => imagem.produto, {
    eager: true,
    cascade: true,
  })
  imagens: ImagemProduto[];

  @OneToMany(() => ProdutoTamanho, (tamanho) => tamanho.produto, {
    eager: true,
    cascade: true,
  })
  tamanhos: ProdutoTamanho[];
}
