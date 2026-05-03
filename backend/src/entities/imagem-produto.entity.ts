import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Produto } from './produto.entity';

@Entity('imagens_produto')
export class ImagemProduto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'produto_id' })
  produtoId: number;

  @Column({ type: 'text' })
  url: string;

  @Column({ default: false })
  principal: boolean;

  @Column({ default: 0 })
  ordem: number;

  @ManyToOne(() => Produto, (produto) => produto.imagens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produto_id' })
  produto: Produto;
}
