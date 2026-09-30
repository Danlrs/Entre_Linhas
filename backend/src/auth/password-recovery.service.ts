import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities/usuario.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { getValidatedEnv } from '../config/env.schema';
import { RecoveryMailService } from './recovery-mail.service';

const GENERIC_MESSAGE = 'Se este e-mail estiver cadastrado, você receberá um código de recuperação. Confira também a pasta de spam.';
const INVALID_CODE = 'Código inválido ou expirado. Confira o código ou solicite um novo.';

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);
  constructor(private readonly db: DataSource, private readonly mail: RecoveryMailService) {}

  private digest(value: string): string {
    return createHmac('sha256', getValidatedEnv().jwt.refreshSecret).update(`password-reset:${value}`).digest('hex');
  }

  private async findUser(email: string, manager = this.db.manager): Promise<Usuario | null> {
    const users = await manager.getRepository(Usuario).createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: email.trim().toLowerCase() }).take(2).getMany();
    return users.length === 1 ? users[0] : null;
  }

  async requestCode(email: string): Promise<{ message: string }> {
    this.mail.assertConfigured();
    const user = await this.findUser(email);
    if (!user) return { message: GENERIC_MESSAGE };
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const hash = this.digest(`${user.id}:${code}`);
    // Upsert atômico: intervalo e cota por conta persistem entre instâncias e reinícios.
    const rows: { usuario_id: number }[] = await this.db.query(`
      INSERT INTO password_resets
        (usuario_id, email, password_snapshot, code_hash, token_hash, attempts, expires_at,
         last_requested_at, window_start, request_count)
      VALUES ($1, $2, $3, $4, NULL, 0, NOW() + INTERVAL '10 minutes', NOW(), NOW(), 1)
      ON CONFLICT (usuario_id) DO UPDATE SET
        email = EXCLUDED.email, password_snapshot = EXCLUDED.password_snapshot,
        code_hash = EXCLUDED.code_hash, token_hash = NULL, attempts = 0,
        expires_at = EXCLUDED.expires_at, last_requested_at = NOW(),
        window_start = CASE WHEN password_resets.window_start < NOW() - INTERVAL '1 hour'
          THEN NOW() ELSE password_resets.window_start END,
        request_count = CASE WHEN password_resets.window_start < NOW() - INTERVAL '1 hour'
          THEN 1 ELSE password_resets.request_count + 1 END
      WHERE password_resets.last_requested_at < NOW() - INTERVAL '1 minute'
        AND (password_resets.window_start < NOW() - INTERVAL '1 hour' OR password_resets.request_count < 5)
      RETURNING usuario_id`, [user.id, user.email.toLowerCase(), user.password, hash]);
    if (!rows.length) return { message: GENERIC_MESSAGE };
    try {
      await this.mail.sendCode(user.email, code);
    } catch {
      await this.db.getRepository(PasswordReset).update({ usuarioId: user.id, codeHash: hash }, { codeHash: null });
      this.logger.error('Falha no envio da recuperação via Gmail. Confira a autorização e as variáveis GMAIL no Render.');
      // Não distinguir conta inexistente de falha de entrega na resposta pública.
    }
    return { message: GENERIC_MESSAGE };
  }

  async verifyCode(email: string, code: string): Promise<{ token: string }> {
    const user = await this.findUser(email);
    if (!user) throw new BadRequestException(INVALID_CODE);
    const token = await this.db.transaction(async (manager) => {
      const row = await manager.findOne(PasswordReset, {
        where: { usuarioId: user.id }, lock: { mode: 'pessimistic_write' },
      });
      if (!row?.codeHash || row.expiresAt <= new Date() || row.attempts >= 5 ||
          row.email !== user.email.toLowerCase() || row.passwordSnapshot !== user.password) return null;
      row.attempts++;
      const expected = Buffer.from(row.codeHash, 'hex');
      const actual = Buffer.from(this.digest(`${user.id}:${code}`), 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        await manager.save(row); // Commitar tentativas erradas; não lançar erro dentro da transação.
        return null;
      }
      const secret = randomBytes(32).toString('hex');
      row.codeHash = null; // código de uso único
      row.tokenHash = this.digest(secret);
      row.expiresAt = new Date(Date.now() + 10 * 60_000);
      await manager.save(row);
      return secret;
    });
    if (!token) throw new BadRequestException(INVALID_CODE);
    return { token };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('A senha é muito longa. Use no máximo 72 bytes.');
    }
    const hash = this.digest(token);
    const passwordHash = await bcrypt.hash(password, 12);
    const changed = await this.db.transaction(async (manager: EntityManager) => {
      const row = await manager.findOne(PasswordReset, {
        where: { tokenHash: hash }, lock: { mode: 'pessimistic_write' },
      });
      if (!row || row.expiresAt <= new Date()) return false;
      const result = await manager.createQueryBuilder().update(Usuario).set({ password: passwordHash })
        .where('id = :id AND LOWER(email) = :email AND senha = :old', {
          id: row.usuarioId, email: row.email, old: row.passwordSnapshot,
        }).execute();
      if (!result.affected) return false;
      row.tokenHash = null;
      row.codeHash = null;
      await manager.save(row);
      await manager.update(RefreshToken, { usuarioId: row.usuarioId }, { revokedAt: new Date() });
      return true;
    });
    if (!changed) throw new BadRequestException('Recuperação inválida ou expirada. Solicite um novo código.');
    return { message: 'Senha redefinida. Entre com sua nova senha.' };
  }
}
