/**
 * Reglas de horario en la hora local del restaurante. El servidor puede correr en UTC (Render): nunca
 * se usa `getDay()` ni `toTimeString()` del servidor para decidir si el restaurante está abierto.
 */
export interface DiaHorario {
  /** 0 = domingo … 6 = sábado. */
  dia: number;
  apertura: string | null;
  cierre: string | null;
  /** Hora en que cocina deja de recibir pedidos; si falta, la de cierre. */
  cocinaCierre: string | null;
  cerrado: boolean;
}

export interface DiaEspecial {
  fecha: string; // YYYY-MM-DD
  cerrado: boolean;
  apertura: string | null;
  cierre: string | null;
}

export interface MomentoLocal {
  fecha: string; // YYYY-MM-DD
  dia: number;
  /** Minutos desde la medianoche local. */
  minutos: number;
}

const DIAS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function momentoLocal(fecha: Date, zonaHoraria: string): MomentoLocal {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    dia: DIAS[partes.weekday],
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

/** Minutos que la hora local va adelante de UTC en ese instante (México: −360). */
export function desfaseUtcMin(fecha: Date, zonaHoraria: string): number {
  const local = momentoLocal(fecha, zonaHoraria);
  const [y, m, d] = local.fecha.split('-').map(Number);
  const comoUtc = Date.UTC(
    y,
    m - 1,
    d,
    Math.floor(local.minutos / 60),
    local.minutos % 60,
  );
  return Math.round(
    (comoUtc - Math.floor(fecha.getTime() / 60_000) * 60_000) / 60_000,
  );
}

export const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/** «13:00:00» → «13:00». */
export const hhmm = (hora: string): string => hora.slice(0, 5);

/** Horario que aplica ese día (el especial manda sobre el semanal), o `null` si está cerrado. */
export function horarioDelDia(
  momento: MomentoLocal,
  semana: DiaHorario[],
  especiales: DiaEspecial[],
): { apertura: string; cierre: string; cocinaCierre: string } | null {
  const especial = especiales.find((e) => e.fecha === momento.fecha);
  if (especial?.cerrado) return null;
  const base = semana.find((d) => d.dia === momento.dia);
  if (!base || base.cerrado) return null;
  const apertura = especial?.apertura ?? base.apertura;
  const cierre = especial?.cierre ?? base.cierre;
  if (!apertura || !cierre) return null;
  return { apertura, cierre, cocinaCierre: base.cocinaCierre ?? cierre };
}
