import { diaLocal } from './horario';

describe('diaLocal', () => {
  it('a las 20:00 de México (02:00 UTC del día siguiente) el día sigue siendo el local', () => {
    const { inicio, fin } = diaLocal(
      new Date('2026-11-14T02:00:00Z'),
      'America/Mexico_City',
    );
    expect(inicio.toISOString()).toBe('2026-11-13T06:00:00.000Z');
    expect(fin.toISOString()).toBe('2026-11-14T06:00:00.000Z');
  });

  it('a las 07:00 de México empieza un día nuevo', () => {
    expect(
      diaLocal(
        new Date('2026-11-14T13:00:00Z'),
        'America/Mexico_City',
      ).inicio.toISOString(),
    ).toBe('2026-11-14T06:00:00.000Z');
  });
});
