import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryColumn({ name: 'usuario_id', type: 'integer' }) usuarioId: number;
  @Column() email: string;
  @Column({ name: 'password_snapshot' }) passwordSnapshot: string;
  @Column({ name: 'code_hash', type: 'varchar', nullable: true }) codeHash: string | null;
  @Column({ name: 'token_hash', type: 'varchar', nullable: true }) tokenHash: string | null;
  @Column({ default: 0 }) attempts: number;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'last_requested_at', type: 'timestamptz' }) lastRequestedAt: Date;
  @Column({ name: 'window_start', type: 'timestamptz' }) windowStart: Date;
  @Column({ name: 'request_count', type: 'integer' }) requestCount: number;
}
