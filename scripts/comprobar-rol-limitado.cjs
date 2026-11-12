/**
 * Comprueba con un usuario de BD limitado (sin BYPASSRLS) las operaciones que dependen de RLS:
 * archivar y restaurar (id entero y UUID), webhook de Stripe idempotente, reportes y promociones.
 * Todo ocurre en una transacción que se revierte: no deja datos.
 * Uso (tras `pnpm build`): DATABASE_URL_ROL_LIMITADO=postgres://sgr_usuario_backend...  node scripts/comprobar-rol-limitado.cjs
 */
require('dotenv').config({ path: '.env', quiet: true });
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { sql } = require('drizzle-orm');
const { schema } = require(process.cwd() + '/dist/src/database/schema');
const { archivarYBorrar } = require(process.cwd() + '/dist/src/registros-eliminados/archivar');
const { RegistrosEliminadosService } = require(process.cwd() + '/dist/src/registros-eliminados/registros-eliminados.service');
const { PromocionesService } = require(process.cwd() + '/dist/src/promociones/promociones.service');
const url = process.env.DATABASE_URL_ROL_LIMITADO;
if (!url) {
  console.error('Falta DATABASE_URL_ROL_LIMITADO.');
  process.exit(1);
}
(async () => {
  const cliente = postgres(url, { max: 1, prepare: false });
  const db = drizzle(cliente, { schema });
  const out = {};
  const paso = async (nombre, fn) => { try { out[nombre] = await fn(); } catch (e) { out[nombre] = 'ERROR ' + (e.cause?.message || e.message); } };
  try {
    await db.transaction(async (tx) => {
      out.usuario = (await tx.execute(sql`select current_user u`))[0].u;
      const registros = new RegistrosEliminadosService(tx);
      const ciclo = async (tabla, id) => {
        const antes = (await tx.execute(sql`select md5((to_jsonb(t) - 'actualizado_en' - 'updated_at')::text) h from ${sql.identifier(tabla)} t where id = ${id}`))[0]?.h;
        const n = await archivarYBorrar(tx, tabla, id, { motivo: 'prueba rol', autorId: null });
        const [r] = await tx.execute(sql`select id from registros_eliminados where tabla_origen = ${tabla} and registro_id = ${String(id)} order by id desc limit 1`);
        await registros.restaurar(Number(r.id), (await tx.execute(sql`select min(id) id from users`))[0].id);
        const despues = (await tx.execute(sql`select md5((to_jsonb(t) - 'actualizado_en' - 'updated_at')::text) h from ${sql.identifier(tabla)} t where id = ${id}`))[0]?.h;
        return { archivadas: n, identica: !!antes && antes === despues };
      };
      await paso('direccion_int', async () => ciclo('direcciones_cliente', (await tx.execute(sql`select min(id) id from direcciones_cliente`))[0].id));
      await paso('empleado_uuid', async () => ciclo('empleados', (await tx.execute(sql`select id from empleados order by id limit 1`))[0].id));
      await paso('metodo_pago_uuid', async () => ciclo('metodos_pago_guardados', (await tx.execute(sql`select id from metodos_pago_guardados order by id limit 1`))[0].id));
      await paso('perfil_fiscal_uuid', async () => {
        const cli = (await tx.execute(sql`select id from clientes order by id limit 1`))[0].id;
        const [p] = await tx.execute(sql`insert into perfiles_facturacion (cliente_id, rfc, razon_social, uso_cfdi, regimen_fiscal, codigo_postal_fiscal) values (${cli}, 'XAXX010101000', 'PRUEBA', 'G03', '616', '43000') returning id`);
        return ciclo('perfiles_facturacion', p.id);
      });
      await paso('stripe_events', async () => {
        const ins = await tx.execute(sql`insert into stripe_events (event_id, type) values ('evt_prueba_rol', 'payment_intent.succeeded') on conflict do nothing returning event_id`);
        const rep = await tx.execute(sql`insert into stripe_events (event_id, type) values ('evt_prueba_rol', 'payment_intent.succeeded') on conflict do nothing returning event_id`);
        return { primera: ins.length, repetida: rep.length };
      });
      await paso('reportes_problemas', async () => (await tx.execute(sql`insert into reportes_problemas (tipo, descripcion, ruta) values ('otro', 'PRUEBA DE ROL LIMITADO', '/') returning id`)).length);
      await paso('promociones', async () => {
        const s = new PromocionesService(tx);
        const p = await s.crear({ titulo: 'PRUEBA ROL', activa: true, orden: 0 });
        const e = await s.actualizar(p.id, { activa: false });
        const b = await s.eliminar(p.id, { motivo: 'prueba', autorId: null });
        return { creada: !!p.id, editada: e.activa === false, borrada: b.success };
      });
      throw new Error('ROLLBACK_INTENCIONADO');
    });
  } catch (e) { if (e.message !== 'ROLLBACK_INTENCIONADO') out.error = e.message; }
  out.trasRollback = (await db.execute(sql`select (select count(*) from registros_eliminados)::int r, (select count(*) from stripe_events)::int s, (select count(*) from reportes_problemas)::int p, (select count(*) from promociones)::int pr`))[0];
  console.log(JSON.stringify(out));
  await cliente.end();
})();
