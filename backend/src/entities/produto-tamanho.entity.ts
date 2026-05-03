import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Produto } from './produto.entity';
import { decimalTransformer, nullableDecimalTransformer } from './decimal.transformer';

@Entity('produto_tamanhos')
export class ProdutoTamanho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'produto_id' })
  produtoId: number;

  @Column({ length: 50 })
  nome: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  preco: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  profundidade: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  comprimento: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  largura: number | null;

  @Column({ type: 'int', nullable: true })
  estoque: number | null;

  @Column({ default: true })
  ativo: boolean;

  @Column({ default: 0 })
  ordem: number;

  @ManyToOne(() => Produto, (produto) => produto.tamanhos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produto_id' })
  produto: Produto;
}
