import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 50 })
  login: string;

  @Column({ name: 'senha' })
  password: string;

  @Column({ nullable: true, unique: true, length: 20 })
  telefone: string | null;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;
}
