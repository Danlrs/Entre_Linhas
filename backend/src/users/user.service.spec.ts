import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { UserService } from './user.service';

describe('UserService identity lookup', () => {
  const query = { where: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn(),
    update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), execute: jest.fn() };
  const repo = { createQueryBuilder: () => query };
  const service = new UserService(repo as unknown as Repository<Usuario>);

  it('trims and lowercases identifiers for case-insensitive login/email lookup', async () => {
    query.getMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.findByIdentifier('  Admin@Example.com  ')).resolves.toEqual({ id: 1 });
    expect(query.where).toHaveBeenCalledWith(
      'LOWER(user.login) = :login OR LOWER(user.email) = :email',
      { login: 'admin@example.com', email: 'admin@example.com' },
    );
  });

  it('rejects ambiguous login/email matches', async () => {
    query.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await expect(service.findByIdentifier('duplicate@example.com')).resolves.toBeNull();
  });

  it('does not overwrite a different Google identity', async () => {
    query.execute.mockResolvedValue({ affected: 0 });
    await expect(service.linkGoogle(1, 'new-sub')).rejects.toThrow('já possui outro Google');
  });

  it('handles a concurrent link to another user as a conflict', async () => {
    query.execute.mockRejectedValue({ code: '23505' });
    await expect(service.linkGoogle(1, 'duplicate-sub')).rejects.toThrow('já está vinculada');
  });
});
