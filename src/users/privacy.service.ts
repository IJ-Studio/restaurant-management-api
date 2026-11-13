import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { BcryptService } from '../auth/bcrypt.service';
import { ROLES } from '../common/constants/roles';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  consentimientos,
  type ConsentOrigin,
  type ConsentType,
} from '../database/schema/consentimientos.schema';
import { deviceTokens } from '../database/schema/device-tokens.schema';
import {
  clientes,
  direccionesCliente,
  metodosPagoGuardados,
  perfilesFacturacion,
  users,
} from '../database/schema/public.schema';
import type { UpdatePrivacyDto } from './dto/privacy.dto';

export interface PrivacyState {
  avisoPrivacidad: {
    aceptado: boolean;
    version: string | null;
    fecha: string | null;
  };
  /** Preferencias de exclusión: activas mientras la persona no las desactive. */
  notificacionesPush: boolean;
  reportesErrores: boolean;
}

/** Privacidad de la cuenta propia (derechos ARCO): consentimientos, preferencias y cancelación. */
@Injectable()
export class PrivacyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly bcryptService: BcryptService,
    private readonly authService: AuthService,
  ) {}

  async getState(userId: number): Promise<PrivacyState> {
    const rows = await this.db
      .selectDistinctOn([consentimientos.tipo], {
        tipo: consentimientos.tipo,
        otorgado: consentimientos.otorgado,
        version: consentimientos.version,
        creadoEn: consentimientos.creadoEn,
      })
      .from(consentimientos)
      .where(eq(consentimientos.userId, userId))
      .orderBy(consentimientos.tipo, desc(consentimientos.creadoEn));

    const latest = (tipo: ConsentType) => rows.find((r) => r.tipo === tipo);
    const notice = latest('aviso_privacidad');
    return {
      avisoPrivacidad: {
        aceptado: notice?.otorgado ?? false,
        version: notice?.version ?? null,
        fecha: notice?.creadoEn ?? null,
      },
      notificacionesPush: latest('notificaciones_push')?.otorgado ?? true,
      reportesErrores: latest('reportes_errores')?.otorgado ?? true,
    };
  }

  /** Inserta una fila por cada campo enviado; nunca edita ni borra las anteriores. */
  async update(userId: number, dto: UpdatePrivacyDto): Promise<PrivacyState> {
    const origen: ConsentOrigin = dto.origen;
    const rows: (typeof consentimientos.$inferInsert)[] = [];
    if (dto.avisoPrivacidad) {
      rows.push({
        userId,
        origen,
        tipo: 'aviso_privacidad',
        otorgado: dto.avisoPrivacidad.aceptado,
        version: dto.avisoPrivacidad.version,
      });
    }
    if (dto.notificacionesPush !== undefined) {
      rows.push({
        userId,
        origen,
        tipo: 'notificaciones_push',
        otorgado: dto.notificacionesPush,
      });
    }
    if (dto.reportesErrores !== undefined) {
      rows.push({
        userId,
        origen,
        tipo: 'reportes_errores',
        otorgado: dto.reportesErrores,
      });
    }
    if (rows.length === 0) {
      throw new BadRequestException('No hay cambios de privacidad que guardar');
    }

    await this.db.insert(consentimientos).values(rows);
    return this.getState(userId);
  }

  /**
   * Cancelación (ARCO): desactiva la cuenta y borra o anonimiza los datos personales.
   * Se conservan empleados, nómina, pedidos, pagos y facturas (obligación fiscal y laboral),
   * que quedan enlazados a un usuario sin datos.
   */
  async deleteOwnAccount(userId: number, password: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.isActive) {
      throw new BadRequestException('Usuario no encontrado');
    }
    // 400 y no 401: un 401 con sesión válida haría que la app cerrara la sesión.
    if (!(await this.bcryptService.compare(password, user.password))) {
      throw new BadRequestException('La contraseña no es correcta');
    }
    if (user.roleId === ROLES.ADMIN) {
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.roleId, ROLES.ADMIN), eq(users.isActive, true)));
      if (total <= 1) {
        throw new ConflictException(
          'Eres el único administrador activo. Nombra a otro administrador antes de eliminar tu cuenta.',
        );
      }
    }

    const unusablePassword = await this.bcryptService.hash(
      randomBytes(32).toString('hex'),
    );
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: 'USUARIO',
          lastname: 'ELIMINADO',
          email: `eliminado-${String(userId)}@eliminado.invalid`,
          phone: '',
          password: unusablePassword,
          verified: false,
          isActive: false,
        })
        .where(eq(users.id, userId));
      await tx.delete(deviceTokens).where(eq(deviceTokens.userId, userId));

      const clientIds = (
        await tx
          .select({ id: clientes.id })
          .from(clientes)
          .where(eq(clientes.userId, userId))
      ).map((c) => c.id);
      if (clientIds.length === 0) return;

      await tx
        .delete(direccionesCliente)
        .where(inArray(direccionesCliente.clienteId, clientIds));
      await tx
        .delete(metodosPagoGuardados)
        .where(inArray(metodosPagoGuardados.clienteId, clientIds));
      await tx
        .delete(perfilesFacturacion)
        .where(inArray(perfilesFacturacion.clienteId, clientIds));
      // shortcut: el cliente de Stripe (`stripe_customer_id`) no se borra en Stripe; hacerlo cuando los pagos en línea salgan del modo de prueba.
      await tx
        .update(clientes)
        .set({
          rfc: null,
          razonSocial: null,
          fechaNacimiento: null,
          sexo: null,
          ciudad: null,
          colonia: null,
          codigoPostal: null,
          alergias: null,
          notas: null,
        })
        .where(eq(clientes.userId, userId));
    });

    await this.authService.signOut(userId);
  }
}
