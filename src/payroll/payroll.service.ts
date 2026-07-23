import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  empleados,
  puestos,
  departamentos,
} from '../database/schema/public.schema';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';

const selection = {
  id: empleados.id,
  name: empleados.nombre,
  active: empleados.activo,
  puestoId: puestos.id,
  role: puestos.nombre,
  weeklyPay: puestos.salarioBase,
  department: departamentos.nombre,
};

function toEntry(row: {
  id: string;
  name: string | null;
  active: boolean | null;
  role: string | null;
  weeklyPay: string | null;
  department: string | null;
}) {
  return {
    id: row.id,
    name: row.name ?? '',
    active: row.active ?? true,
    role: row.role ?? '',
    weeklyPay: row.weeklyPay ? Number(row.weeklyPay) : 0,
    department: row.department ?? null,
  };
}

@Injectable()
export class PayrollService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    const rows = await this.db
      .select(selection)
      .from(empleados)
      .leftJoin(puestos, eq(empleados.puestoId, puestos.id))
      .leftJoin(departamentos, eq(puestos.departamentoId, departamentos.id))
      .where(isNotNull(empleados.puestoId));

    return rows.map(toEntry);
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select(selection)
      .from(empleados)
      .leftJoin(puestos, eq(empleados.puestoId, puestos.id))
      .leftJoin(departamentos, eq(puestos.departamentoId, departamentos.id))
      .where(eq(empleados.id, id));

    if (!row) throw new NotFoundException('Empleado no encontrado');
    return toEntry(row);
  }

  async create(dto: CreatePayrollEntryDto) {
    const departmentName = dto.department?.trim() || 'General';
    const [existingDept] = await this.db
      .select()
      .from(departamentos)
      .where(eq(departamentos.nombre, departmentName));

    const departamentoId = existingDept
      ? existingDept.id
      : (
          await this.db
            .insert(departamentos)
            .values({ nombre: departmentName })
            .returning()
        )[0].id;

    const [puesto] = await this.db
      .insert(puestos)
      .values({
        departamentoId,
        nombre: dto.role,
        salarioBase: String(dto.weeklyPay),
      })
      .returning();

    const [empleado] = await this.db
      .insert(empleados)
      .values({
        puestoId: puesto.id,
        nombre: dto.name,
        activo: dto.active ?? true,
      })
      .returning();

    return this.findOne(empleado.id);
  }

  async update(id: string, dto: UpdatePayrollEntryDto) {
    const [empleado] = await this.db
      .select()
      .from(empleados)
      .where(eq(empleados.id, id));

    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    if (dto.name !== undefined || dto.active !== undefined) {
      await this.db
        .update(empleados)
        .set({
          ...(dto.name !== undefined && { nombre: dto.name }),
          ...(dto.active !== undefined && { activo: dto.active }),
        })
        .where(eq(empleados.id, id));
    }

    if (
      (dto.role !== undefined || dto.weeklyPay !== undefined) &&
      empleado.puestoId
    ) {
      await this.db
        .update(puestos)
        .set({
          ...(dto.role !== undefined && { nombre: dto.role }),
          ...(dto.weeklyPay !== undefined && {
            salarioBase: String(dto.weeklyPay),
          }),
        })
        .where(eq(puestos.id, empleado.puestoId));
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const [empleado] = await this.db
      .select()
      .from(empleados)
      .where(eq(empleados.id, id));

    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    await this.db.delete(empleados).where(eq(empleados.id, id));

    if (empleado.puestoId) {
      const others = await this.db
        .select()
        .from(empleados)
        .where(eq(empleados.puestoId, empleado.puestoId));
      if (others.length === 0) {
        await this.db.delete(puestos).where(eq(puestos.id, empleado.puestoId));
      }
    }
  }
}
