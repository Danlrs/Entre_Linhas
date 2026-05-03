import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('materiais')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 50, nullable: true })
  tipo: string | null;

  @Column({ name: 'imagem_url', type: 'text', nullable: true })
  imagemUrl: string | null;
}
