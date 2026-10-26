import { BadRequestException, ForbiddenException } from '@nestjs/common';

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

const updateProfile = { name: 'Ana María', phone: '+525598765432' };
const changePassword = {
  currentPassword: 'Vieja#2026',
  newPassword: 'Nueva#2026',
};

function setup(
  rows: unknown[][] = [],
  options: { compare?: boolean; listRows?: unknown[] } = {},
) {
  const results = [...rows];
  const listLimit = jest.fn().mockResolvedValue(options.listRows ?? []);
  const listOrderBy = jest.fn().mockReturnValue({ limit: listLimit });
  const selectWhere = jest.fn(() =>
    Object.assign(Promise.resolve(results.shift() ?? []), {
      orderBy: listOrderBy,
    }),
  );

  const returning = jest.fn().mockResolvedValue([row]);
  const updateWhere = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where: updateWhere });
  const db = {
    select: () => ({ from: () => ({ where: selectWhere }) }),
    update: () => ({ set }),
  };
  const compare = jest.fn().mockResolvedValue(options.compare ?? true);
  const hash = jest.fn().mockResolvedValue('$2b$10$nuevoHash');
  const bcrypt = {
    compare,
    hash,
  } as unknown as BcryptService;
  const service = new UsersService(db as never, bcrypt);

  return { service, set, updateWhere, compare, hash, selectWhere, listLimit };
}

describe('UsersService.getPublicUserById', () => {
  it('el propio usuario ve su perfil sin hash ni campos de seguridad', async () => {
    const { service } = setup([[row]]);

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
    const { service } = setup([[admin], [row]]);

    const result = await service.getPublicUserById(7, 1);

    expect(result.id).toBe(7);
    expect(result).not.toHaveProperty('password');
  });

  it('un usuario normal no puede ver el perfil de otro → 403', async () => {
    const { service } = setup([[row]]);

    const error: unknown = await service
      .getPublicUserById(8, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
  });
});

describe('UsersService.getAllUsers', () => {
  const admin = { ...row, id: 1, roleId: ROLES.ADMIN };
  const listed = [admin, { ...row, id: 8 }];

  it('devuelve solo campos públicos, sin hash ni contadores', async () => {
    const { service } = setup([[admin]], { listRows: listed });

    const result = await service.getAllUsers(1, { limit: 50 });

    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('password');
    expect(result[0]).not.toHaveProperty('loginAttempts');
    expect(JSON.stringify(result)).not.toContain('hashDeLaContrasena');
  });

  it('aplica el límite y el cursor', async () => {
    const { service, listLimit, selectWhere } = setup([[admin]], {
      listRows: [row],
    });

    await service.getAllUsers(1, { limit: 2, cursor: 7 });

    expect(listLimit).toHaveBeenCalledWith(2);
    expect(selectWhere).toHaveBeenCalledTimes(2);
  });

  it('un usuario que no es admin no puede listar → 403', async () => {
    const { service } = setup([[row]]);

    const error: unknown = await service
      .getAllUsers(7, {})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
  });
});

describe('UsersService.updateUser', () => {
  it('solo escribe los campos del DTO de perfil', async () => {
    const { service, set } = setup([[row]]);

    const result = await service.updateUser(7, updateProfile, 7);

    expect(set).toHaveBeenCalledWith(updateProfile);
    expect(result).not.toHaveProperty('password');
  });

  it('un usuario normal no puede actualizar a otro → 403', async () => {
    const { service } = setup([[row]]);

    const error: unknown = await service
      .updateUser(8, updateProfile, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
  });
});

describe('UsersService.changePassword', () => {
  it('hashea la nueva contraseña y limpia intentos y bloqueo', async () => {
    const { service, set, compare, hash } = setup([[row]]);

    await service.changePassword(7, changePassword, 7);

    expect(compare).toHaveBeenCalledWith('Vieja#2026', row.password);
    expect(hash).toHaveBeenCalledWith('Nueva#2026');
    expect(set).toHaveBeenCalledWith({
      password: '$2b$10$nuevoHash',
      loginAttempts: 0,
      loginLockUntil: 0,
    });
    const [payload] = set.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(payload)).not.toContain('Nueva#2026');
  });

  it('contraseña actual incorrecta → 400 y no actualiza', async () => {
    const { service, set } = setup([[row]], { compare: false });

    const error: unknown = await service
      .changePassword(7, changePassword, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('no puede cambiar la contraseña de otro usuario → 403', async () => {
    const { service, selectWhere } = setup();

    const error: unknown = await service
      .changePassword(8, changePassword, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(selectWhere).not.toHaveBeenCalled();
  });
});

describe('UsersService.deleteUser', () => {
  const admin = { ...row, id: 1, roleId: ROLES.ADMIN };

  it('hace borrado lógico (isActive=false) en vez de borrar la fila', async () => {
    const { service, set } = setup([[admin], [row]]);

    await service.deleteUser(7, 1);

    expect(set).toHaveBeenCalledWith({ isActive: false });
  });

  it('un admin no puede borrarse a sí mismo → 400', async () => {
    const { service, set } = setup([[admin]]);

    const error: unknown = await service
      .deleteUser(1, 1)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('no se puede borrar al último admin activo → 400', async () => {
    const otherAdmin = { ...admin, id: 2 };
    const { service, set } = setup([[admin], [otherAdmin], [{ count: 1 }]]);

    const error: unknown = await service
      .deleteUser(2, 1)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('un admin sí puede desactivar a otro admin si hay más de uno', async () => {
    const otherAdmin = { ...admin, id: 2 };
    const { service, set } = setup([[admin], [otherAdmin], [{ count: 2 }]]);

    await service.deleteUser(2, 1);

    expect(set).toHaveBeenCalledWith({ isActive: false });
  });

  it('un usuario que no es admin no puede borrar → 403', async () => {
    const { service, set } = setup([[row]]);

    const error: unknown = await service
      .deleteUser(8, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(set).not.toHaveBeenCalled();
  });
});

describe('UsersService.changeRole', () => {
  it('un admin cambia el rol y recibe el perfil sin hash', async () => {
    const admin = { ...row, id: 1, roleId: ROLES.ADMIN };
    const { service, set } = setup([[admin]], {});
    set.mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([{ ...row, roleId: ROLES.MESERO }]),
      }),
    });

    const result = await service.changeRole(7, ROLES.MESERO, 1);

    expect(set).toHaveBeenCalledWith({ roleId: ROLES.MESERO });
    expect(result.roleId).toBe(ROLES.MESERO);
    expect(result).not.toHaveProperty('password');
  });

  it('un usuario que no es admin no puede cambiar roles → 403', async () => {
    const { service, set } = setup([[row]]);

    const error: unknown = await service
      .changeRole(8, ROLES.MESERO, 7)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(set).not.toHaveBeenCalled();
  });
});
