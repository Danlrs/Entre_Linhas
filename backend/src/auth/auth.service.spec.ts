import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { RefreshToken } from '../entities/refresh-token.entity';

jest.mock('../config/env.schema', () => ({ getValidatedEnv: () => ({
  jwt: { refreshSecret: 'test-refresh-secret', refreshExpiresIn: '7d', accessExpiresIn: '15m' },
}) }));

describe('AuthService login', () => {
  const users = { findByIdentifier: jest.fn(), findByGoogleSubject: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
  const sessions = { save: jest.fn() };
  let auth: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = new AuthService(users as unknown as UserService, jwt as unknown as JwtService,
      sessions as unknown as Repository<RefreshToken>);
  });

  it.each(['daniel', 'daniel@example.com'])('accepts identifier %s with the correct password', async (login) => {
    users.findByIdentifier.mockResolvedValue({ id: 1, login: 'daniel', email: 'daniel@example.com', password: await bcrypt.hash('password', 4) });
    const result = await auth.login({ login, password: 'password' });
    expect(users.findByIdentifier).toHaveBeenCalledWith(login);
    expect(result.user.id).toBe(1);
    expect(result.refresh_token).toBeTruthy();
    expect(sessions.save).toHaveBeenCalledTimes(1);
  });

  it('rejects nonexistent users with the same response as wrong passwords', async () => {
    users.findByIdentifier.mockResolvedValue(null);
    await expect(auth.login({ login: 'missing', password: 'wrong' })).rejects.toThrow('Credenciais inválidas.');
    users.findByIdentifier.mockResolvedValue({ password: await bcrypt.hash('password', 4) });
    await expect(auth.login({ login: 'daniel', password: 'wrong' })).rejects.toThrow('Credenciais inválidas.');
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('does not create an account or issue sessions for an unlinked Google identity', async () => {
    users.findByGoogleSubject.mockResolvedValue(null);
    await expect(auth.loginGoogle('google-sub')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('issues the existing session format for a linked Google identity', async () => {
    users.findByGoogleSubject.mockResolvedValue({ id: 7, login: 'admin', email: 'admin@example.com' });
    const result = await auth.loginGoogle('google-sub');
    expect(result.user.id).toBe(7);
    expect(users.findByGoogleSubject).toHaveBeenCalledWith('google-sub');
    expect(result.access_token).toBeTruthy();
  });
});
