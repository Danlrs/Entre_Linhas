import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { decimalTransformer } from './decimal.transformer';

@Entity('estampas')
export class Estampa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column({ name: 'imagem_url', type: 'text', nullable: true })
  imagemUrl: string | null;

  @Column({
    name: 'valor_adicional',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  valorAdicional: number;
}
