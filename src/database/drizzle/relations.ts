import { relations } from "drizzle-orm/relations";
import { departamentos, puestos, empleados, users, horariosEmpleado, turnos, asistencias, vacaciones, nomina, evaluacionesDesempeno, capacitaciones, capacitacionesEmpleado, categoriasMenu, subcategoriasMenu, platillos, informacionNutricional, variantesPlatillo, gruposModificadores, modificadores, combos, combosItems, menusDelDia, menusDelDiaItems, alergenos, ingredientes, categoriasIngrediente, unidadesMedida, recetas, recetasIngredientes, ordenesCompra, proveedores, ordenesCompraItems, movimientosInventario, conteosInventario, conteosInventarioItems, areasSalon, mesas, estatusMesa, ordenes, clientes, reservaciones, direccionesCliente, programaLealtad, nivelesLealtad, cuentasLealtad, transaccionesLealtad, preferenciasCliente, historialEstatusOrden, ordenItems, estacionesCocina, ordenItemModificadores, comandas, pagos, metodosPago, facturas, cupones, cuponesUsos, reembolsos, cierresCaja, gastos, categoriasGasto, presupuestos, resenas, encuestasSatisfaccion, preguntasEncuesta, respuestasEncuesta, logsAuditoria, notificaciones, platillosAlergenos, platillosModificadores, categoriasEstacion, proveedoresIngredientes } from "../schema";

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
	horariosEmpleados: many(horariosEmpleado),
	asistencias_aprobadoPor: many(asistencias, {
		relationName: "asistencias_aprobadoPor_empleados_id"
	}),
	asistencias_empleadoId: many(asistencias, {
		relationName: "asistencias_empleadoId_empleados_id"
	}),
	vacaciones_aprobadoPor: many(vacaciones, {
		relationName: "vacaciones_aprobadoPor_empleados_id"
	}),
	vacaciones_empleadoId: many(vacaciones, {
		relationName: "vacaciones_empleadoId_empleados_id"
	}),
	nominas: many(nomina),
	evaluacionesDesempenos_empleadoId: many(evaluacionesDesempeno, {
		relationName: "evaluacionesDesempeno_empleadoId_empleados_id"
	}),
	evaluacionesDesempenos_evaluadorId: many(evaluacionesDesempeno, {
		relationName: "evaluacionesDesempeno_evaluadorId_empleados_id"
	}),
	capacitacionesEmpleados: many(capacitacionesEmpleado),
}));

export const usersRelations = relations(users, ({many}) => ({
	empleados: many(empleados),
	ordenesCompras: many(ordenesCompra),
	movimientosInventarios: many(movimientosInventario),
	conteosInventarios: many(conteosInventario),
	clientes: many(clientes),
	reservaciones: many(reservaciones),
	ordenes: many(ordenes),
	historialEstatusOrdens: many(historialEstatusOrden),
	pagos: many(pagos),
	facturas: many(facturas),
	cuponesUsos: many(cuponesUsos),
	reembolsos: many(reembolsos),
	cierresCajas: many(cierresCaja),
	gastos_aprobadoPor: many(gastos, {
		relationName: "gastos_aprobadoPor_users_id"
	}),
	gastos_registradoPor: many(gastos, {
		relationName: "gastos_registradoPor_users_id"
	}),
	resenas_respondidoPor: many(resenas, {
		relationName: "resenas_respondidoPor_users_id"
	}),
	resenas_userId: many(resenas, {
		relationName: "resenas_userId_users_id"
	}),
	respuestasEncuestas: many(respuestasEncuesta),
	logsAuditorias: many(logsAuditoria),
	notificaciones: many(notificaciones),
}));

export const horariosEmpleadoRelations = relations(horariosEmpleado, ({one}) => ({
	empleado: one(empleados, {
		fields: [horariosEmpleado.empleadoId],
		references: [empleados.id]
	}),
	turno: one(turnos, {
		fields: [horariosEmpleado.turnoId],
		references: [turnos.id]
	}),
}));

export const turnosRelations = relations(turnos, ({many}) => ({
	horariosEmpleados: many(horariosEmpleado),
}));

export const asistenciasRelations = relations(asistencias, ({one}) => ({
	empleado_aprobadoPor: one(empleados, {
		fields: [asistencias.aprobadoPor],
		references: [empleados.id],
		relationName: "asistencias_aprobadoPor_empleados_id"
	}),
	empleado_empleadoId: one(empleados, {
		fields: [asistencias.empleadoId],
		references: [empleados.id],
		relationName: "asistencias_empleadoId_empleados_id"
	}),
}));

export const vacacionesRelations = relations(vacaciones, ({one}) => ({
	empleado_aprobadoPor: one(empleados, {
		fields: [vacaciones.aprobadoPor],
		references: [empleados.id],
		relationName: "vacaciones_aprobadoPor_empleados_id"
	}),
	empleado_empleadoId: one(empleados, {
		fields: [vacaciones.empleadoId],
		references: [empleados.id],
		relationName: "vacaciones_empleadoId_empleados_id"
	}),
}));

export const nominaRelations = relations(nomina, ({one}) => ({
	empleado: one(empleados, {
		fields: [nomina.empleadoId],
		references: [empleados.id]
	}),
}));

export const evaluacionesDesempenoRelations = relations(evaluacionesDesempeno, ({one}) => ({
	empleado_empleadoId: one(empleados, {
		fields: [evaluacionesDesempeno.empleadoId],
		references: [empleados.id],
		relationName: "evaluacionesDesempeno_empleadoId_empleados_id"
	}),
	empleado_evaluadorId: one(empleados, {
		fields: [evaluacionesDesempeno.evaluadorId],
		references: [empleados.id],
		relationName: "evaluacionesDesempeno_evaluadorId_empleados_id"
	}),
}));

export const capacitacionesEmpleadoRelations = relations(capacitacionesEmpleado, ({one}) => ({
	capacitacione: one(capacitaciones, {
		fields: [capacitacionesEmpleado.capacitacionId],
		references: [capacitaciones.id]
	}),
	empleado: one(empleados, {
		fields: [capacitacionesEmpleado.empleadoId],
		references: [empleados.id]
	}),
}));

export const capacitacionesRelations = relations(capacitaciones, ({many}) => ({
	capacitacionesEmpleados: many(capacitacionesEmpleado),
}));

export const subcategoriasMenuRelations = relations(subcategoriasMenu, ({one, many}) => ({
	categoriasMenu: one(categoriasMenu, {
		fields: [subcategoriasMenu.categoriaId],
		references: [categoriasMenu.id]
	}),
	platillos: many(platillos),
}));

export const categoriasMenuRelations = relations(categoriasMenu, ({many}) => ({
	subcategoriasMenus: many(subcategoriasMenu),
	platillos: many(platillos),
	categoriasEstacions: many(categoriasEstacion),
}));

export const platillosRelations = relations(platillos, ({one, many}) => ({
	categoriasMenu: one(categoriasMenu, {
		fields: [platillos.categoriaId],
		references: [categoriasMenu.id]
	}),
	subcategoriasMenu: one(subcategoriasMenu, {
		fields: [platillos.subcategoriaId],
		references: [subcategoriasMenu.id]
	}),
	informacionNutricionals: many(informacionNutricional),
	variantesPlatillos: many(variantesPlatillo),
	combosItems: many(combosItems),
	menusDelDiaItems: many(menusDelDiaItems),
	recetas: many(recetas),
	preferenciasClientes: many(preferenciasCliente),
	ordenItems: many(ordenItems),
	platillosAlergenos: many(platillosAlergenos),
	platillosModificadores: many(platillosModificadores),
}));

export const informacionNutricionalRelations = relations(informacionNutricional, ({one}) => ({
	platillo: one(platillos, {
		fields: [informacionNutricional.platilloId],
		references: [platillos.id]
	}),
}));

export const variantesPlatilloRelations = relations(variantesPlatillo, ({one, many}) => ({
	platillo: one(platillos, {
		fields: [variantesPlatillo.platilloId],
		references: [platillos.id]
	}),
	recetas: many(recetas),
	ordenItems: many(ordenItems),
}));

export const modificadoresRelations = relations(modificadores, ({one, many}) => ({
	gruposModificadore: one(gruposModificadores, {
		fields: [modificadores.grupoId],
		references: [gruposModificadores.id]
	}),
	ordenItemModificadores: many(ordenItemModificadores),
}));

export const gruposModificadoresRelations = relations(gruposModificadores, ({many}) => ({
	modificadores: many(modificadores),
	platillosModificadores: many(platillosModificadores),
}));

export const combosItemsRelations = relations(combosItems, ({one}) => ({
	combo: one(combos, {
		fields: [combosItems.comboId],
		references: [combos.id]
	}),
	platillo: one(platillos, {
		fields: [combosItems.platilloId],
		references: [platillos.id]
	}),
}));

export const combosRelations = relations(combos, ({many}) => ({
	combosItems: many(combosItems),
	ordenItems: many(ordenItems),
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

export const ingredientesRelations = relations(ingredientes, ({one, many}) => ({
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
	recetasIngredientes: many(recetasIngredientes),
	ordenesCompraItems: many(ordenesCompraItems),
	movimientosInventarios: many(movimientosInventario),
	conteosInventarioItems: many(conteosInventarioItems),
	proveedoresIngredientes: many(proveedoresIngredientes),
}));

export const alergenosRelations = relations(alergenos, ({many}) => ({
	ingredientes: many(ingredientes),
	platillosAlergenos: many(platillosAlergenos),
}));

export const categoriasIngredienteRelations = relations(categoriasIngrediente, ({many}) => ({
	ingredientes: many(ingredientes),
}));

export const unidadesMedidaRelations = relations(unidadesMedida, ({many}) => ({
	ingredientes_unidadCompraId: many(ingredientes, {
		relationName: "ingredientes_unidadCompraId_unidadesMedida_id"
	}),
	ingredientes_unidadUsoId: many(ingredientes, {
		relationName: "ingredientes_unidadUsoId_unidadesMedida_id"
	}),
	recetasIngredientes: many(recetasIngredientes),
	ordenesCompraItems: many(ordenesCompraItems),
	movimientosInventarios: many(movimientosInventario),
	proveedoresIngredientes: many(proveedoresIngredientes),
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

export const ordenesCompraRelations = relations(ordenesCompra, ({one, many}) => ({
	user: one(users, {
		fields: [ordenesCompra.creadoPor],
		references: [users.id]
	}),
	proveedore: one(proveedores, {
		fields: [ordenesCompra.proveedorId],
		references: [proveedores.id]
	}),
	ordenesCompraItems: many(ordenesCompraItems),
}));

export const proveedoresRelations = relations(proveedores, ({many}) => ({
	ordenesCompras: many(ordenesCompra),
	gastos: many(gastos),
	proveedoresIngredientes: many(proveedoresIngredientes),
}));

export const ordenesCompraItemsRelations = relations(ordenesCompraItems, ({one}) => ({
	ingrediente: one(ingredientes, {
		fields: [ordenesCompraItems.ingredienteId],
		references: [ingredientes.id]
	}),
	ordenesCompra: one(ordenesCompra, {
		fields: [ordenesCompraItems.ordenCompraId],
		references: [ordenesCompra.id]
	}),
	unidadesMedida: one(unidadesMedida, {
		fields: [ordenesCompraItems.unidadId],
		references: [unidadesMedida.id]
	}),
}));

export const movimientosInventarioRelations = relations(movimientosInventario, ({one}) => ({
	ingrediente: one(ingredientes, {
		fields: [movimientosInventario.ingredienteId],
		references: [ingredientes.id]
	}),
	unidadesMedida: one(unidadesMedida, {
		fields: [movimientosInventario.unidadId],
		references: [unidadesMedida.id]
	}),
	user: one(users, {
		fields: [movimientosInventario.userId],
		references: [users.id]
	}),
}));

export const conteosInventarioRelations = relations(conteosInventario, ({one, many}) => ({
	user: one(users, {
		fields: [conteosInventario.userId],
		references: [users.id]
	}),
	conteosInventarioItems: many(conteosInventarioItems),
}));

export const conteosInventarioItemsRelations = relations(conteosInventarioItems, ({one}) => ({
	conteosInventario: one(conteosInventario, {
		fields: [conteosInventarioItems.conteoId],
		references: [conteosInventario.id]
	}),
	ingrediente: one(ingredientes, {
		fields: [conteosInventarioItems.ingredienteId],
		references: [ingredientes.id]
	}),
}));

export const mesasRelations = relations(mesas, ({one, many}) => ({
	areasSalon: one(areasSalon, {
		fields: [mesas.areaId],
		references: [areasSalon.id]
	}),
	estatusMesas: many(estatusMesa),
	reservaciones: many(reservaciones),
	preferenciasClientes: many(preferenciasCliente),
	ordenes: many(ordenes),
}));

export const areasSalonRelations = relations(areasSalon, ({many}) => ({
	mesas: many(mesas),
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

export const ordenesRelations = relations(ordenes, ({one, many}) => ({
	estatusMesas: many(estatusMesa),
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
	historialEstatusOrdens: many(historialEstatusOrden),
	ordenItems: many(ordenItems),
	comandas: many(comandas),
	pagos: many(pagos),
	facturas: many(facturas),
	cuponesUsos: many(cuponesUsos),
	resenas: many(resenas),
	respuestasEncuestas: many(respuestasEncuesta),
}));

export const clientesRelations = relations(clientes, ({one, many}) => ({
	user: one(users, {
		fields: [clientes.userId],
		references: [users.id]
	}),
	direccionesClientes: many(direccionesCliente),
	cuentasLealtads: many(cuentasLealtad),
	preferenciasClientes: many(preferenciasCliente),
	ordenes: many(ordenes),
}));

export const reservacionesRelations = relations(reservaciones, ({one, many}) => ({
	mesa: one(mesas, {
		fields: [reservaciones.mesaId],
		references: [mesas.id]
	}),
	user: one(users, {
		fields: [reservaciones.userId],
		references: [users.id]
	}),
	ordenes: many(ordenes),
}));

export const direccionesClienteRelations = relations(direccionesCliente, ({one}) => ({
	cliente: one(clientes, {
		fields: [direccionesCliente.clienteId],
		references: [clientes.id]
	}),
}));

export const nivelesLealtadRelations = relations(nivelesLealtad, ({one, many}) => ({
	programaLealtad: one(programaLealtad, {
		fields: [nivelesLealtad.programaId],
		references: [programaLealtad.id]
	}),
	cuentasLealtads: many(cuentasLealtad),
}));

export const programaLealtadRelations = relations(programaLealtad, ({many}) => ({
	nivelesLealtads: many(nivelesLealtad),
}));

export const cuentasLealtadRelations = relations(cuentasLealtad, ({one, many}) => ({
	cliente: one(clientes, {
		fields: [cuentasLealtad.clienteId],
		references: [clientes.id]
	}),
	nivelesLealtad: one(nivelesLealtad, {
		fields: [cuentasLealtad.nivelId],
		references: [nivelesLealtad.id]
	}),
	transaccionesLealtads: many(transaccionesLealtad),
}));

export const transaccionesLealtadRelations = relations(transaccionesLealtad, ({one}) => ({
	cuentasLealtad: one(cuentasLealtad, {
		fields: [transaccionesLealtad.cuentaId],
		references: [cuentasLealtad.id]
	}),
}));

export const preferenciasClienteRelations = relations(preferenciasCliente, ({one}) => ({
	cliente: one(clientes, {
		fields: [preferenciasCliente.clienteId],
		references: [clientes.id]
	}),
	mesa: one(mesas, {
		fields: [preferenciasCliente.mesaPreferida],
		references: [mesas.id]
	}),
	platillo: one(platillos, {
		fields: [preferenciasCliente.platilloFavorito],
		references: [platillos.id]
	}),
}));

export const historialEstatusOrdenRelations = relations(historialEstatusOrden, ({one}) => ({
	ordene: one(ordenes, {
		fields: [historialEstatusOrden.ordenId],
		references: [ordenes.id]
	}),
	user: one(users, {
		fields: [historialEstatusOrden.userId],
		references: [users.id]
	}),
}));

export const ordenItemsRelations = relations(ordenItems, ({one, many}) => ({
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
	ordenItemModificadores: many(ordenItemModificadores),
}));

export const estacionesCocinaRelations = relations(estacionesCocina, ({many}) => ({
	ordenItems: many(ordenItems),
	comandas: many(comandas),
	categoriasEstacions: many(categoriasEstacion),
}));

export const ordenItemModificadoresRelations = relations(ordenItemModificadores, ({one}) => ({
	modificadore: one(modificadores, {
		fields: [ordenItemModificadores.modificadorId],
		references: [modificadores.id]
	}),
	ordenItem: one(ordenItems, {
		fields: [ordenItemModificadores.ordenItemId],
		references: [ordenItems.id]
	}),
}));

export const comandasRelations = relations(comandas, ({one}) => ({
	estacionesCocina: one(estacionesCocina, {
		fields: [comandas.estacionId],
		references: [estacionesCocina.id]
	}),
	ordene: one(ordenes, {
		fields: [comandas.ordenId],
		references: [ordenes.id]
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
	gastos: many(gastos),
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

export const cuponesUsosRelations = relations(cuponesUsos, ({one}) => ({
	cupone: one(cupones, {
		fields: [cuponesUsos.cuponId],
		references: [cupones.id]
	}),
	ordene: one(ordenes, {
		fields: [cuponesUsos.ordenId],
		references: [ordenes.id]
	}),
	user: one(users, {
		fields: [cuponesUsos.userId],
		references: [users.id]
	}),
}));

export const cuponesRelations = relations(cupones, ({many}) => ({
	cuponesUsos: many(cuponesUsos),
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

export const cierresCajaRelations = relations(cierresCaja, ({one}) => ({
	user: one(users, {
		fields: [cierresCaja.userId],
		references: [users.id]
	}),
}));

export const gastosRelations = relations(gastos, ({one}) => ({
	user_aprobadoPor: one(users, {
		fields: [gastos.aprobadoPor],
		references: [users.id],
		relationName: "gastos_aprobadoPor_users_id"
	}),
	categoriasGasto: one(categoriasGasto, {
		fields: [gastos.categoriaId],
		references: [categoriasGasto.id]
	}),
	metodosPago: one(metodosPago, {
		fields: [gastos.metodoPagoId],
		references: [metodosPago.id]
	}),
	proveedore: one(proveedores, {
		fields: [gastos.proveedorId],
		references: [proveedores.id]
	}),
	user_registradoPor: one(users, {
		fields: [gastos.registradoPor],
		references: [users.id],
		relationName: "gastos_registradoPor_users_id"
	}),
}));

export const categoriasGastoRelations = relations(categoriasGasto, ({many}) => ({
	gastos: many(gastos),
	presupuestos: many(presupuestos),
}));

export const presupuestosRelations = relations(presupuestos, ({one}) => ({
	categoriasGasto: one(categoriasGasto, {
		fields: [presupuestos.categoriaId],
		references: [categoriasGasto.id]
	}),
}));

export const resenasRelations = relations(resenas, ({one}) => ({
	ordene: one(ordenes, {
		fields: [resenas.ordenId],
		references: [ordenes.id]
	}),
	user_respondidoPor: one(users, {
		fields: [resenas.respondidoPor],
		references: [users.id],
		relationName: "resenas_respondidoPor_users_id"
	}),
	user_userId: one(users, {
		fields: [resenas.userId],
		references: [users.id],
		relationName: "resenas_userId_users_id"
	}),
}));

export const preguntasEncuestaRelations = relations(preguntasEncuesta, ({one}) => ({
	encuestasSatisfaccion: one(encuestasSatisfaccion, {
		fields: [preguntasEncuesta.encuestaId],
		references: [encuestasSatisfaccion.id]
	}),
}));

export const encuestasSatisfaccionRelations = relations(encuestasSatisfaccion, ({many}) => ({
	preguntasEncuestas: many(preguntasEncuesta),
	respuestasEncuestas: many(respuestasEncuesta),
}));

export const respuestasEncuestaRelations = relations(respuestasEncuesta, ({one}) => ({
	encuestasSatisfaccion: one(encuestasSatisfaccion, {
		fields: [respuestasEncuesta.encuestaId],
		references: [encuestasSatisfaccion.id]
	}),
	ordene: one(ordenes, {
		fields: [respuestasEncuesta.ordenId],
		references: [ordenes.id]
	}),
	user: one(users, {
		fields: [respuestasEncuesta.userId],
		references: [users.id]
	}),
}));

export const logsAuditoriaRelations = relations(logsAuditoria, ({one}) => ({
	user: one(users, {
		fields: [logsAuditoria.userId],
		references: [users.id]
	}),
}));

export const notificacionesRelations = relations(notificaciones, ({one}) => ({
	user: one(users, {
		fields: [notificaciones.userId],
		references: [users.id]
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
