import { relations } from "drizzle-orm/relations";
import {
	perfilesFacturacion,   // 👈 NUEVO
	metodosPagoGuardados,
	direccionesCliente,
	inventarioProductos,
	inventarioMermas,
	inventarioProveedores,
	inventarioOrdenes,
	inventarioProveedorProducto,
	menusDelDia,
	menusDelDiaItems,
	platillos,
	recetas,
	variantesPlatillo,
	combos,
	ordenItems,
	estacionesCocina,
	ordenes,
	ingredientes,
	recetasIngredientes,
	unidadesMedida,
	ventas,
	categoriasMenu,
	subcategoriasMenu,
	departamentos,
	puestos,
	empleados,
	 users,
	nomina,
	gruposModificadores,
	modificadores,
	alergenos,
	categoriasIngrediente,
	areasSalon,
	mesas,
	logsAuditoria,
	clientes,
	reservaciones,
	pagos,
	metodosPago,
	estatusMesa,
	cierresCaja,
	facturas,
	reembolsos,
	categoriasEstacion,
	platillosModificadores,
	platillosAlergenos,
	proveedoresIngredientes,
	proveedores
} from "./public.schema";

export const inventarioMermasRelations = relations(inventarioMermas, ({one}) => ({
	inventarioProducto: one(inventarioProductos, {
		fields: [inventarioMermas.productId],
		references: [inventarioProductos.id]
	}),
}));

export const inventarioProductosRelations = relations(inventarioProductos, ({many}) => ({
	inventarioMermas: many(inventarioMermas),
	inventarioProveedorProductos: many(inventarioProveedorProducto),
}));

export const inventarioOrdenesRelations = relations(inventarioOrdenes, ({one}) => ({
	inventarioProveedore: one(inventarioProveedores, {
		fields: [inventarioOrdenes.supplierId],
		references: [inventarioProveedores.id]
	}),
}));

export const inventarioProveedoresRelations = relations(inventarioProveedores, ({many}) => ({
	inventarioOrdenes: many(inventarioOrdenes),
	inventarioProveedorProductos: many(inventarioProveedorProducto),
}));

export const inventarioProveedorProductoRelations = relations(inventarioProveedorProducto, ({one}) => ({
	inventarioProducto: one(inventarioProductos, {
		fields: [inventarioProveedorProducto.productoId],
		references: [inventarioProductos.id]
	}),
	inventarioProveedore: one(inventarioProveedores, {
		fields: [inventarioProveedorProducto.proveedorId],
		references: [inventarioProveedores.id]
	}),
}));

export const menusDelDiaItemsRelations = relations(menusDelDiaItems, ({one}) => ({
	menusDelDia: one(menusDelDia, {
		fields: [menusDelDiaItems.menuDiaId],
		references: [menusDelDia.id]
	}),
	platillo: one(platillos, {
		fields: [menusDelDiaItems.platilloId],
		references: [platillos.id]
	}),
}));

export const menusDelDiaRelations = relations(menusDelDia, ({many}) => ({
	menusDelDiaItems: many(menusDelDiaItems),
}));

export const platillosRelations = relations(platillos, ({one, many}) => ({
	menusDelDiaItems: many(menusDelDiaItems),
	recetas: many(recetas),
	ordenItems: many(ordenItems),
	ventas: many(ventas),
	categoriasMenu: one(categoriasMenu, {
		fields: [platillos.categoriaId],
		references: [categoriasMenu.id]
	}),
	subcategoriasMenu: one(subcategoriasMenu, {
		fields: [platillos.subcategoriaId],
		references: [subcategoriasMenu.id]
	}),
	variantesPlatillos: many(variantesPlatillo),
	platillosModificadores: many(platillosModificadores),
	platillosAlergenos: many(platillosAlergenos),
}));
export const metodosPagoGuardadosRelations = relations(metodosPagoGuardados, ({one}) => ({
	cliente: one(clientes, {
		fields: [metodosPagoGuardados.clienteId],
		references: [clientes.id]
	}),
}));
export const perfilesFacturacionRelations = relations(perfilesFacturacion, ({one}) => ({
	cliente: one(clientes, {
		fields: [perfilesFacturacion.clienteId],
		references: [clientes.id]
	}),
}));
export const recetasRelations = relations(recetas, ({one, many}) => ({
	platillo: one(platillos, {
		fields: [recetas.platilloId],
		references: [platillos.id]
	}),
	variantesPlatillo: one(variantesPlatillo, {
		fields: [recetas.varianteId],
		references: [variantesPlatillo.id]
	}),
	recetasIngredientes: many(recetasIngredientes),
}));

export const variantesPlatilloRelations = relations(variantesPlatillo, ({one, many}) => ({
	recetas: many(recetas),
	ordenItems: many(ordenItems),
	platillo: one(platillos, {
		fields: [variantesPlatillo.platilloId],
		references: [platillos.id]
	}),
}));

export const ordenItemsRelations = relations(ordenItems, ({one}) => ({
	combo: one(combos, {
		fields: [ordenItems.comboId],
		references: [combos.id]
	}),
	estacionesCocina: one(estacionesCocina, {
		fields: [ordenItems.estacionId],
		references: [estacionesCocina.id]
	}),
	ordene: one(ordenes, {
		fields: [ordenItems.ordenId],
		references: [ordenes.id]
	}),
	platillo: one(platillos, {
		fields: [ordenItems.platilloId],
		references: [platillos.id]
	}),
	variantesPlatillo: one(variantesPlatillo, {
		fields: [ordenItems.varianteId],
		references: [variantesPlatillo.id]
	}),
}));

export const combosRelations = relations(combos, ({many}) => ({
	ordenItems: many(ordenItems),
}));

export const estacionesCocinaRelations = relations(estacionesCocina, ({many}) => ({
	ordenItems: many(ordenItems),
	categoriasEstacions: many(categoriasEstacion),
}));

export const ordenesRelations = relations(ordenes, ({one, many}) => ({
	user: one(users, {
		fields: [ordenes.atendidoPor],
		references: [users.id]
	}),
	cliente: one(clientes, {
		fields: [ordenes.clienteId],
		references: [clientes.id]
	}),
	mesa: one(mesas, {
		fields: [ordenes.mesaId],
		references: [mesas.id]
	}),
	reservacione: one(reservaciones, {
		fields: [ordenes.reservacionId],
		references: [reservaciones.id]
	}),
	direccionEnvio: one(direccionesCliente, {          // 👈 NUEVO
		fields: [ordenes.direccionEnvioId],
		references: [direccionesCliente.id]
	}),
	ordenItems: many(ordenItems),
	pagos: many(pagos),
	estatusMesas: many(estatusMesa),
	facturas: many(facturas),
}));

export const recetasIngredientesRelations = relations(recetasIngredientes, ({one}) => ({
	ingrediente: one(ingredientes, {
		fields: [recetasIngredientes.ingredienteId],
		references: [ingredientes.id]
	}),
	receta: one(recetas, {
		fields: [recetasIngredientes.recetaId],
		references: [recetas.id]
	}),
	unidadesMedida: one(unidadesMedida, {
		fields: [recetasIngredientes.unidadId],
		references: [unidadesMedida.id]
	}),
}));

export const ingredientesRelations = relations(ingredientes, ({one, many}) => ({
	recetasIngredientes: many(recetasIngredientes),
	alergeno: one(alergenos, {
		fields: [ingredientes.alergenoId],
		references: [alergenos.id]
	}),
	categoriasIngrediente: one(categoriasIngrediente, {
		fields: [ingredientes.categoriaId],
		references: [categoriasIngrediente.id]
	}),
	unidadesMedida_unidadCompraId: one(unidadesMedida, {
		fields: [ingredientes.unidadCompraId],
		references: [unidadesMedida.id],
		relationName: "ingredientes_unidadCompraId_unidadesMedida_id"
	}),
	unidadesMedida_unidadUsoId: one(unidadesMedida, {
		fields: [ingredientes.unidadUsoId],
		references: [unidadesMedida.id],
		relationName: "ingredientes_unidadUsoId_unidadesMedida_id"
	}),
	proveedoresIngredientes: many(proveedoresIngredientes),
}));

export const unidadesMedidaRelations = relations(unidadesMedida, ({many}) => ({
	recetasIngredientes: many(recetasIngredientes),
	ingredientes_unidadCompraId: many(ingredientes, {
		relationName: "ingredientes_unidadCompraId_unidadesMedida_id"
	}),
	ingredientes_unidadUsoId: many(ingredientes, {
		relationName: "ingredientes_unidadUsoId_unidadesMedida_id"
	}),
	proveedoresIngredientes: many(proveedoresIngredientes),
}));

export const ventasRelations = relations(ventas, ({one}) => ({
	platillo: one(platillos, {
		fields: [ventas.platilloId],
		references: [platillos.id]
	}),
}));

export const categoriasMenuRelations = relations(categoriasMenu, ({many}) => ({
	platillos: many(platillos),
	subcategoriasMenus: many(subcategoriasMenu),
	categoriasEstacions: many(categoriasEstacion),
}));

export const subcategoriasMenuRelations = relations(subcategoriasMenu, ({one, many}) => ({
	platillos: many(platillos),
	categoriasMenu: one(categoriasMenu, {
		fields: [subcategoriasMenu.categoriaId],
		references: [categoriasMenu.id]
	}),
}));

export const puestosRelations = relations(puestos, ({one, many}) => ({
	departamento: one(departamentos, {
		fields: [puestos.departamentoId],
		references: [departamentos.id]
	}),
	empleados: many(empleados),
}));

export const departamentosRelations = relations(departamentos, ({many}) => ({
	puestos: many(puestos),
}));

export const empleadosRelations = relations(empleados, ({one, many}) => ({
	puesto: one(puestos, {
		fields: [empleados.puestoId],
		references: [puestos.id]
	}),
	user: one(users, {
		fields: [empleados.userId],
		references: [users.id]
	}),
	nominas: many(nomina),
}));

export const usersRelations = relations(users, ({many}) => ({
	empleados: many(empleados),
	logsAuditorias: many(logsAuditoria),
	ordenes: many(ordenes),
	pagos: many(pagos),
	cierresCajas: many(cierresCaja),
	facturas: many(facturas),
	reservaciones: many(reservaciones),
	reembolsos: many(reembolsos),
	clientes: many(clientes),
}));

export const nominaRelations = relations(nomina, ({one}) => ({
	empleado: one(empleados, {
		fields: [nomina.empleadoId],
		references: [empleados.id]
	}),
}));

export const modificadoresRelations = relations(modificadores, ({one}) => ({
	gruposModificadore: one(gruposModificadores, {
		fields: [modificadores.grupoId],
		references: [gruposModificadores.id]
	}),
}));

export const gruposModificadoresRelations = relations(gruposModificadores, ({many}) => ({
	modificadores: many(modificadores),
	platillosModificadores: many(platillosModificadores),
}));

export const alergenosRelations = relations(alergenos, ({many}) => ({
	ingredientes: many(ingredientes),
	platillosAlergenos: many(platillosAlergenos),
}));

export const categoriasIngredienteRelations = relations(categoriasIngrediente, ({many}) => ({
	ingredientes: many(ingredientes),
}));

export const mesasRelations = relations(mesas, ({one, many}) => ({
	areasSalon: one(areasSalon, {
		fields: [mesas.areaId],
		references: [areasSalon.id]
	}),
	ordenes: many(ordenes),
	estatusMesas: many(estatusMesa),
	reservaciones: many(reservaciones),
}));

export const areasSalonRelations = relations(areasSalon, ({many}) => ({
	mesas: many(mesas),
}));

export const logsAuditoriaRelations = relations(logsAuditoria, ({one}) => ({
	user: one(users, {
		fields: [logsAuditoria.userId],
		references: [users.id]
	}),
}));

export const clientesRelations = relations(clientes, ({one, many}) => ({
	direccionesClientes: many(direccionesCliente),
	ordenes: many(ordenes),
	user: one(users, {
		fields: [clientes.userId],
		references: [users.id]
	}),
	metodosPagoGuardados: many(metodosPagoGuardados), // 👈 NUEVO
	perfilesFacturacion: many(perfilesFacturacion), // 👈 NUEVO
}));

export const reservacionesRelations = relations(reservaciones, ({one, many}) => ({
	ordenes: many(ordenes),
	mesa: one(mesas, {
		fields: [reservaciones.mesaId],
		references: [mesas.id]
	}),
	user: one(users, {
		fields: [reservaciones.userId],
		references: [users.id]
	}),
}));

export const pagosRelations = relations(pagos, ({one, many}) => ({
	user: one(users, {
		fields: [pagos.cobradoPor],
		references: [users.id]
	}),
	metodosPago: one(metodosPago, {
		fields: [pagos.metodoPagoId],
		references: [metodosPago.id]
	}),
	ordene: one(ordenes, {
		fields: [pagos.ordenId],
		references: [ordenes.id]
	}),
	reembolsos: many(reembolsos),
}));

export const metodosPagoRelations = relations(metodosPago, ({many}) => ({
	pagos: many(pagos),
}));

export const estatusMesaRelations = relations(estatusMesa, ({one}) => ({
	mesa: one(mesas, {
		fields: [estatusMesa.mesaId],
		references: [mesas.id]
	}),
	ordene: one(ordenes, {
		fields: [estatusMesa.ordenId],
		references: [ordenes.id]
	}),
}));

export const cierresCajaRelations = relations(cierresCaja, ({one}) => ({
	user: one(users, {
		fields: [cierresCaja.userId],
		references: [users.id]
	}),
}));

export const facturasRelations = relations(facturas, ({one}) => ({
	ordene: one(ordenes, {
		fields: [facturas.ordenId],
		references: [ordenes.id]
	}),
	user: one(users, {
		fields: [facturas.userId],
		references: [users.id]
	}),
}));

export const reembolsosRelations = relations(reembolsos, ({one}) => ({
	user: one(users, {
		fields: [reembolsos.aprobadoPor],
		references: [users.id]
	}),
	pago: one(pagos, {
		fields: [reembolsos.pagoId],
		references: [pagos.id]
	}),
}));

export const categoriasEstacionRelations = relations(categoriasEstacion, ({one}) => ({
	categoriasMenu: one(categoriasMenu, {
		fields: [categoriasEstacion.categoriaId],
		references: [categoriasMenu.id]
	}),
	estacionesCocina: one(estacionesCocina, {
		fields: [categoriasEstacion.estacionId],
		references: [estacionesCocina.id]
	}),
}));

export const platillosModificadoresRelations = relations(platillosModificadores, ({one}) => ({
	gruposModificadore: one(gruposModificadores, {
		fields: [platillosModificadores.grupoId],
		references: [gruposModificadores.id]
	}),
	platillo: one(platillos, {
		fields: [platillosModificadores.platilloId],
		references: [platillos.id]
	}),
}));

export const platillosAlergenosRelations = relations(platillosAlergenos, ({one}) => ({
	alergeno: one(alergenos, {
		fields: [platillosAlergenos.alergenoId],
		references: [alergenos.id]
	}),
	platillo: one(platillos, {
		fields: [platillosAlergenos.platilloId],
		references: [platillos.id]
	}),
}));

export const proveedoresIngredientesRelations = relations(proveedoresIngredientes, ({one}) => ({
	ingrediente: one(ingredientes, {
		fields: [proveedoresIngredientes.ingredienteId],
		references: [ingredientes.id]
	}),
	proveedore: one(proveedores, {
		fields: [proveedoresIngredientes.proveedorId],
		references: [proveedores.id]
	}),
	unidadesMedida: one(unidadesMedida, {
		fields: [proveedoresIngredientes.unidadId],
		references: [unidadesMedida.id]
	}),
}));

export const proveedoresRelations = relations(proveedores, ({many}) => ({
	proveedoresIngredientes: many(proveedoresIngredientes),
}));
