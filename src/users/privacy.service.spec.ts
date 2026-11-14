import { BadRequestException, ConflictException } from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { PrivacyService } from './privacy.service';

const USER = {
  id: 7,
  roleId: ROLES.MESERO as number,
  isActive: true,
  password: 'hash-actual',
};

interface SetupOptions {
  consentRows?: unknown[];
  user?: typeof USER | undefined;
  activeAdmins?: number;
  passwordMatches?: boolean;
  clientIds?: string[];
}

function setup(options: SetupOptions = {}) {
  const {
    consentRows = [],
    activeAdmins = 2,
    passwordMatches = true,
    clientIds = [],
  } = options;
  const user = 'user' in options ? options.user : USER;

  const insertValues = jest.fn().mockResolvedValue(undefined);
  // 1.ª consulta: el usuario; 2.ª (solo admin): administradores activos.
  const selectWhere = jest
    .fn()
    .mockResolvedValueOnce(user ? [user] : [])
    .mockResolvedValueOnce([{ total: activeAdmins }]);

  const txUpdateSet = jest.fn().mockReturnValue({ where: jest.fn() });
  const txDeleteWhere = jest.fn().mockResolvedValue(undefined);
  const tx = {
    update: jest.fn().mockReturnValue({ set: txUpdateSet }),
    delete: jest.fn().mockReturnValue({ where: txDeleteWhere }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(clientIds.map((id) => ({ id }))),
      }),
    }),
  };
  const transaction = jest.fn((run: (t: typeof tx) => Promise<void>) =>
    run(tx),
  );

  const db = {
    selectDistinctOn: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(consentRows),
        }),
      }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({ where: selectWhere }),
    }),
    insert: jest.fn().mockReturnValue({ values: insertValues }),
    transaction,
  };
  const bcrypt = {
    compare: jest.fn().mockResolvedValue(passwordMatches),
    hash: jest.fn().mockResolvedValue('hash-inservible'),
  };
  const auth = { revokeAllSessions: jest.fn().mockResolvedValue(undefined) };
  const service = new PrivacyService(db as never, bcrypt, auth as never);
  return {
    service,
    insertValues,
    transaction,
    tx,
    txUpdateSet,
    txDeleteWhere,
    auth,
  };
}

describe('PrivacyService', () => {
  describe('estado de privacidad', () => {
    it('sin registros: aviso sin aceptar y preferencias activas', async () => {
      const { service } = setup();

      const state = await service.getState(7);

      expect(state).toEqual({
        avisoPrivacidad: { aceptado: false, version: null, fecha: null },
        notificacionesPush: true,
        reportesErrores: true,
      });
    });

    it('toma la última fila de cada tipo', async () => {
      const { service } = setup({
        consentRows: [
          {
            tipo: 'aviso_privacidad',
            otorgado: true,
            version: '2026-11',
            creadoEn: '2026-11-13T10:00:00Z',
          },
          {
            tipo: 'notificaciones_push',
            otorgado: false,
            version: null,
            creadoEn: '2026-11-13T11:00:00Z',
          },
        ],
      });

      const state = await service.getState(7);

      expect(state.avisoPrivacidad).toEqual({
        aceptado: true,
        version: '2026-11',
        fecha: '2026-11-13T10:00:00Z',
      });
      expect(state.notificacionesPush).toBe(false);
      expect(state.reportesErrores).toBe(true);
    });
  });

  describe('registro de consentimientos', () => {
    it('inserta una fila por cada campo enviado, con su origen', async () => {
      const { service, insertValues } = setup();

      await service.update(7, {
        origen: 'movil',
        avisoPrivacidad: { aceptado: true, version: '2026-11' },
        reportesErrores: false,
      });

      expect(insertValues).toHaveBeenCalledWith([
        {
          userId: 7,
          origen: 'movil',
          tipo: 'aviso_privacidad',
          otorgado: true,
          version: '2026-11',
        },
        {
          userId: 7,
          origen: 'movil',
          tipo: 'reportes_errores',
          otorgado: false,
        },
      ]);
    });

    it('rechaza una petición sin cambios y no inserta nada', async () => {
      const { service, insertValues } = setup();

      await expect(service.update(7, { origen: 'web' })).rejects.toThrow(
        BadRequestException,
      );
      expect(insertValues).not.toHaveBeenCalled();
    });
  });

  describe('eliminar la cuenta propia', () => {
    it('con contraseña incorrecta responde 400 y no toca la cuenta', async () => {
      const { service, transaction, auth } = setup({ passwordMatches: false });

      await expect(service.deleteOwnAccount(7, 'mala')).rejects.toThrow(
        new BadRequestException('La contraseña no es correcta'),
      );
      expect(transaction).not.toHaveBeenCalled();
      expect(auth.revokeAllSessions).not.toHaveBeenCalled();
    });

    it('una cuenta ya desactivada no se puede eliminar otra vez', async () => {
      const { service, transaction } = setup({
        user: { ...USER, isActive: false },
      });

      await expect(service.deleteOwnAccount(7, 'x')).rejects.toThrow(
        BadRequestException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('el único administrador activo no puede eliminarse (409)', async () => {
      const { service, transaction } = setup({
        user: { ...USER, roleId: ROLES.ADMIN },
        activeAdmins: 1,
      });

      await expect(service.deleteOwnAccount(7, 'ok')).rejects.toThrow(
        ConflictException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('un administrador con relevo sí puede eliminarse', async () => {
      const { service, transaction } = setup({
        user: { ...USER, roleId: ROLES.ADMIN },
        activeAdmins: 2,
      });

      await service.deleteOwnAccount(7, 'ok');

      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('desactiva, anonimiza, borra los dispositivos y cierra la sesión', async () => {
      const { service, tx, txUpdateSet, txDeleteWhere, auth } = setup();

      await service.deleteOwnAccount(7, 'ok');

      expect(txUpdateSet).toHaveBeenCalledWith({
        name: 'USUARIO',
        lastname: 'ELIMINADO',
        email: 'eliminado-7@eliminado.invalid',
        phone: '',
        password: 'hash-inservible',
        verified: false,
        isActive: false,
      });
      // Personal sin ficha de cliente: solo se borran sus dispositivos.
      expect(txDeleteWhere).toHaveBeenCalledTimes(1);
      expect(tx.update).toHaveBeenCalledTimes(1);
      expect(auth.revokeAllSessions).toHaveBeenCalledWith(7);
    });

    it('con ficha de cliente borra direcciones, tarjetas y perfiles fiscales, y vacía sus datos', async () => {
      const { service, tx, txUpdateSet, txDeleteWhere } = setup({
        clientIds: ['c-1'],
      });

      await service.deleteOwnAccount(7, 'ok');

      // dispositivos + direcciones + métodos de pago guardados + perfiles de facturación
      expect(txDeleteWhere).toHaveBeenCalledTimes(4);
      expect(tx.update).toHaveBeenCalledTimes(2);
      expect(txUpdateSet).toHaveBeenLastCalledWith(
        expect.objectContaining({ rfc: null, alergias: null, notas: null }),
      );
    });
  });
});
