import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { PasswordRecoveryService } from './password-recovery.service';
import { RecoveryMailService } from './recovery-mail.service';
import { PasswordReset } from '../entities/password-reset.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

jest.mock('../config/env.schema', () => ({ getValidatedEnv: () => ({ jwt: { refreshSecret: 'test-secret' } }) }));
const digest = (value: string) => createHmac('sha256', 'test-secret').update(`password-reset:${value}`).digest('hex');

describe('PasswordRecoveryService', () => {
  const user = { id: 1, email: 'user@example.com', password: 'old-hash' };
  let row: PasswordReset;
  let service: PasswordRecoveryService;
  let db: any;
  let manager: any;
  let query: any;
  let mail: any;

  beforeEach(() => {
    row = Object.assign(new PasswordReset(), { usuarioId: 1, email: user.email, passwordSnapshot: user.password,
      codeHash: digest('1:123456'), tokenHash: null, attempts: 0, expiresAt: new Date(Date.now() + 600000) });
    query = { where: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([user]),
      update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({ affected: 1 }) };
    manager = { getRepository: () => ({ createQueryBuilder: () => query }),
      findOne: jest.fn().mockImplementation(async (_entity, options) => {
        if (options.where.tokenHash) return row.tokenHash === options.where.tokenHash ? row : null;
        return row;
      }), save: jest.fn(), update: jest.fn(), createQueryBuilder: () => query };
    db = { manager, transaction: (callback: any) => callback(manager), query: jest.fn().mockResolvedValue([{ usuario_id: 1 }]),
      getRepository: () => ({ update: manager.update }) };
    mail = { assertConfigured: jest.fn(), sendCode: jest.fn() };
    service = new PasswordRecoveryService(db as DataSource, mail as RecoveryMailService);
  });

  it('sends a six-digit code but stores only its digest', async () => {
    await service.requestCode(user.email);
    const code = mail.sendCode.mock.calls[0][1];
    expect(code).toMatch(/^\d{6}$/);
    expect(db.query.mock.calls[0][1][3]).toBe(digest(`1:${code}`));
    expect(db.query.mock.calls[0][0]).toContain('ON CONFLICT');
  });

  it('returns the same message for a missing email without sending mail', async () => {
    const known = await service.requestCode(user.email);
    query.getMany.mockResolvedValue([]); mail.sendCode.mockClear();
    expect(await service.requestCode('missing@example.com')).toEqual(known);
    expect(mail.sendCode).not.toHaveBeenCalled();
  });

  it('does not send when the persistent cooldown/quota rejects the request', async () => {
    db.query.mockResolvedValue([]);
    await service.requestCode(user.email);
    expect(mail.sendCode).not.toHaveBeenCalled();
  });

  it('commits wrong attempts and refuses a correct code after five failures', async () => {
    for (let i = 0; i < 5; i++) await expect(service.verifyCode(user.email, '000000')).rejects.toThrow('Código inválido');
    expect(row.attempts).toBe(5);
    expect(manager.save).toHaveBeenCalledTimes(5);
    await expect(service.verifyCode(user.email, '123456')).rejects.toThrow('Código inválido');
  });

  it('consumes the code once and persists only the reset token hash', async () => {
    const { token } = await service.verifyCode(user.email, '123456');
    expect(token).toHaveLength(64);
    expect(row.tokenHash).toBe(digest(token));
    expect(row.codeHash).toBeNull();
    expect(manager.findOne.mock.calls[0][1].lock.mode).toBe('pessimistic_write');
    await expect(service.verifyCode(user.email, '123456')).rejects.toThrow('Código inválido');
  });

  it.each(['expired', 'changed email', 'changed password'])('rejects a challenge with %s', async (reason) => {
    if (reason === 'expired') row.expiresAt = new Date(0);
    if (reason === 'changed email') row.email = 'other@example.com';
    if (reason === 'changed password') row.passwordSnapshot = 'different';
    await expect(service.verifyCode(user.email, '123456')).rejects.toThrow('Código inválido');
  });

  it('changes the password, revokes refresh sessions and consumes the token atomically', async () => {
    const { token } = await service.verifyCode(user.email, '123456');
    await service.resetPassword(token, 'new-password');
    expect(await bcrypt.compare('new-password', query.set.mock.calls[0][0].password)).toBe(true);
    expect(manager.update).toHaveBeenCalledWith(RefreshToken, { usuarioId: 1 }, { revokedAt: expect.any(Date) });
    expect(row.tokenHash).toBeNull();
    await expect(service.resetPassword(token, 'replayed-password')).rejects.toThrow('Recuperação inválida');
  });

  it('refuses expired reset tokens', async () => {
    const { token } = await service.verifyCode(user.email, '123456');
    row.expiresAt = new Date(0);
    await expect(service.resetPassword(token, 'new-password')).rejects.toThrow('Recuperação inválida');
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('refuses to reset when the account changed after code verification', async () => {
    const { token } = await service.verifyCode(user.email, '123456');
    query.execute.mockResolvedValue({ affected: 0 });
    await expect(service.resetPassword(token, 'new-password')).rejects.toThrow('Recuperação inválida');
    expect(manager.update).not.toHaveBeenCalled();
  });
});
