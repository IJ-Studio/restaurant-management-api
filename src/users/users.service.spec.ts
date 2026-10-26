import { ForbiddenException } from '@nestjs/common';

import { BcryptService } from '../auth/bcrypt.service';
import { ROLES } from '../common/constants/roles';
import { UsersService } from './users.service';

const row = {
  id: 7,
  name: 'Ana',
  lastname: 'López',
  email: 'ana@quijote.mx',
  phone: '+525512345678',
  password: '$2b$10$hashDeLaContrasena',
  verified: true,
  loginAttempts: 2,
  loginLockUntil: null,
  recoveryAttempts: 0,
  recoveryLockUntil: null,
  sessionTime: 0,
  roleId: ROLES.CLIENTE,
  isActive: true,
  createdAt: new Date('2026-10-01'),
};

function setup(...results: unknown[][]) {
  const where = jest.fn();
  for (const result of results) where.mockResolvedValueOnce(result);
  const db = { select: () => ({ from: () => ({ where }) }) };
  const service = new UsersService(db as never, {} as BcryptService);
  return { service };
}

describe('UsersService.getPublicUserById', () => {
  it('el propio usuario ve su perfil sin hash ni campos de seguridad', async () => {
    const { service } = setup([row]);

    const result = await service.getPublicUserById(7, 7);

    expect(result).toEqual({
      id: 7,
      name: 'Ana',
      lastname: 'López',
      email: 'ana@quijote.mx',
      phone: '+525512345678',
      verified: true,
      roleId: ROLES.CLIENTE,
      isActive: true,
      createdAt: row.createdAt,
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('loginAttempts');
    expect(JSON.stringify(result)).not.toContain('hashDeLaContrasena');
  });

  it('un admin puede ver el perfil de otro usuario, sin hash', async () => {
    const admin = { ...row, id: 1, roleId: ROLES.ADMIN };
    const { service } = setup([admin], [row]);

    const result = await service.getPublicUserById(7, 1);

    expect(result.id).toBe(7);
    expect(result).not.toHaveProperty('password');
  });

  it('un usuario normal no puede ver el perfil de otro → 403', async () => {
    const { service } = setup([row]);

    const error: unknown = await service
      .getPublicUserById(8, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
  });
});
