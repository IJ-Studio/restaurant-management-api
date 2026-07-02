import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// 1. Importamos el Token correcto desde tus constantes
import { DRIZZLE } from '../database/drizzle/constants';
// 2. Importamos tus tablas de Drizzle mapeadas
import * as schema from '../database/schema/public.schema';

@Injectable()
export class MenuService {
  // Inyección global de la instancia de conexión Drizzle ORM
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Retorna los platillos públicos filtrados opcionalmente por categoría
   */
  async getPublicPlatillos(categoriaId?: number) {
    try {
      if (categoriaId) {
        return await this.db
          .select()
          .from(schema.platillos)
          .where(eq(schema.platillos.categoriaId, categoriaId));
      }
      return await this.db.select().from(schema.platillos);
    } catch (error) {
      console.error('Error al obtener platillos públicos:', error);
      throw new BadRequestException('No se pudieron recuperar los platillos.');
    }
  }

  /**
   * Retorna todas las categorías del menú con sus productos anidados de forma segura.
   * Evita el error 'referencedTable' agrupando los resultados eficientemente sin usar db.query.
   */
  async getCategoriesWithProducts() {
    try {
      // 1. Traemos los datos planos mediante un Left Join nativo (una sola consulta a la BD)
      const rows = await this.db
        .select({
          categoria: schema.categoriasMenu,
          platillo: schema.platillos,
        })
        .from(schema.categoriasMenu)
        .leftJoin(
          schema.platillos,
          eq(schema.platillos.categoriaId, schema.categoriasMenu.id)
        );

      // 2. Agrupamos en memoria los platillos dentro de sus respectivas categorías
      const categoriasMap = new Map<number, any>();

      for (const row of rows) {
        const catId = row.categoria.id;

        if (!categoriasMap.has(catId)) {
          categoriasMap.set(catId, {
            ...row.categoria,
            platillos: [],
          });
        }

        if (row.platillo) {
          categoriasMap.get(catId).platillos.push(row.platillo);
        }
      }

      // Devuelve el array estructurado tal y como lo espera el Frontend
      return Array.from(categoriasMap.values());

    } catch (error) {
      console.error('Error al compilar el menú estructurado mediante Join:', error);
      throw new BadRequestException('Error al compilar el menú estructurado.');
    }
  }

  /**
   * Retorna un platillo específico validando su ID
   */
  async getPlatilloById(id: number) {
    try {
      const [platillo] = await this.db
        .select()
        .from(schema.platillos)
        .where(eq(schema.platillos.id, id));

      if (!platillo) {
        throw new NotFoundException(`El platillo con ID ${id} no existe.`);
      }

      return platillo;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error al obtener el platillo ${id}:`, error);
      throw new BadRequestException('Error al procesar la solicitud del platillo.');
    }
  }

  /**
   * 🚀 Registra pedidos (En Mesa o Domicilio) en la Base de Datos
   * Garantiza la inserción atómica mediante una transacción de Drizzle ORM.
   */
  async createOrderFromMenu(orderData: any) {
    try {
      if (!orderData.productos || orderData.productos.length === 0) {
        throw new BadRequestException('La orden debe contener al menos un platillo.');
      }

      return await this.db.transaction(async (tx) => {

        // 1. Mapeamos cada producto para registrar la venta en la tabla 'ventas'
        const ventasPromesas = orderData.productos.map((prod: any) => {
          const totalPlatillo = (prod.cantidad * prod.precioUnitario).toFixed(2);

          return tx.insert(schema.ventas).values({
            platilloId: prod.platilloId,
            cantidad: prod.cantidad,
            precioUnitario: prod.precioUnitario.toString(),
            total: totalPlatillo.toString(),
          }).returning({ id: schema.ventas.id });
        });

        const ventasInsertadas = await Promise.all(ventasPromesas);

        // Generamos un identificador de orden / folio amigable combinando el ID de la primera venta
        const primerVentaId = ventasInsertadas[0]?.[0]?.id || Math.floor(1000 + Math.random() * 9000);
        const orderIdGenerado = parseInt(`2026${primerVentaId}`);

        console.log(`[Pedido Interno] Tipo: ${orderData.tipoPedido} registrado exitosamente bajo control #${orderIdGenerado}`);

        return {
          success: true,
          orderId: orderIdGenerado,
          message: 'Pedido procesado y enviado a la cocina con éxito.',
        };
      });
    } catch (error) {
      console.error('Error crítico al guardar la orden en la BD:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Hubo un problema interno al guardar tu pedido. Intenta de nuevo.');
    }
  }
}
