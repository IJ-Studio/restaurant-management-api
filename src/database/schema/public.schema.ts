import { pgTable, unique, serial, varchar, text, boolean, integer, bigint, timestamp, foreignKey, numeric, char, check, smallint, time, date, index, jsonb, uuid, bigserial, inet, primaryKey, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	lastname: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	password: text().notNull(),
	verified: boolean().default(false).notNull(),
	loginAttempts: integer("login_attempts").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	loginLockUntil: bigint("login_lock_until", { mode: "number" }).default(0).notNull(),
	recoveryAttempts: integer("recovery_attempts").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	recoveryLockUntil: bigint("recovery_lock_until", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sessionTime: bigint("session_time", { mode: "number" }).default(0).notNull(),
	roleId: integer("role_id"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const categorias = pgTable("categorias", {
	id: serial().primaryKey().notNull(),
	nombre: text().notNull(),
});

export const ventas = pgTable("ventas", {
	id: serial().primaryKey().notNull(),
	platilloId: integer("platillo_id").notNull(),
	cantidad: integer().notNull(),
	precioUnitario: numeric("precio_unitario", { precision: 10, scale:  2 }).notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	fecha: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "ventas_platillo_id_fkey"
		}),
]);

export const restaurante = pgTable("restaurante", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).default('El Quijote').notNull(),
	nombreLegal: varchar("nombre_legal", { length: 200 }),
	rfc: varchar({ length: 20 }),
	logoUrl: text("logo_url"),
	slogan: varchar({ length: 255 }),
	descripcion: text(),
	direccion: varchar({ length: 200 }).default('Calle Morelos #32, Esq. Hidalgo').notNull(),
	colonia: varchar({ length: 100 }).default('Zona Centro'),
	ciudad: varchar({ length: 100 }).default('Huejutla de Reyes'),
	estado: varchar({ length: 100 }).default('Hidalgo'),
	codigoPostal: varchar("codigo_postal", { length: 10 }).default('43000'),
	latitud: numeric({ precision: 10, scale:  7 }).default('21.1378'),
	longitud: numeric({ precision: 10, scale:  7 }).default('-98.4186'),
	telefono: varchar({ length: 20 }).default('+52 771 702 8172'),
	whatsapp: varchar({ length: 20 }),
	email: varchar({ length: 150 }),
	facebookUrl: text("facebook_url").default('https://www.facebook.com/ElQuijote.Huejutla'),
	instagramUrl: text("instagram_url"),
	moneda: char({ length: 3 }).default('MXN'),
	zonaHoraria: varchar("zona_horaria", { length: 60 }).default('America/Mexico_City'),
	impuestoPct: numeric("impuesto_pct", { precision: 5, scale:  2 }).default('16.00'),
	propinaSugeridaPct: numeric("propina_sugerida_pct", { precision: 5, scale:  2 }).default('10.00'),
	formatoFolio: varchar("formato_folio", { length: 30 }).default('QJT-NNNNNN'),
	mensajeTicket: text("mensaje_ticket").default('¡Gracias por su visita a El Quijote!'),
	pieTicket: text("pie_ticket").default('Calle Morelos #32 Esq. Hidalgo, Huejutla de Reyes, Hgo.'),
	tiempoEsperaMin: integer("tiempo_espera_min").default(15),
	aceptaReservas: boolean("acepta_reservas").default(true),
	aceptaTakeout: boolean("acepta_takeout").default(true),
	permitePropinaTarjeta: boolean("permite_propina_tarjeta").default(true),
	politicaCancelacion: text("politica_cancelacion"),
	anioFundacion: integer("anio_fundacion"),
	activo: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const horarios = pgTable("horarios", {
	id: serial().primaryKey().notNull(),
	diaSemana: smallint("dia_semana").notNull(),
	apertura: time(),
	cierre: time(),
	horaCocinaCierre: time("hora_cocina_cierre"),
	cerrado: boolean().default(false),
	notas: varchar({ length: 150 }),
}, (table) => [
	unique("horarios_dia_semana_key").on(table.diaSemana),
	check("horarios_dia_semana_check", sql`(dia_semana >= 0) AND (dia_semana <= 6)`),
]);

export const horariosEspeciales = pgTable("horarios_especiales", {
	id: serial().primaryKey().notNull(),
	fecha: date().notNull(),
	apertura: time(),
	cierre: time(),
	cerrado: boolean().default(false),
	motivo: varchar({ length: 150 }),
}, (table) => [
	unique("horarios_especiales_fecha_key").on(table.fecha),
]);

export const certificaciones = pgTable("certificaciones", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	organismo: varchar({ length: 150 }),
	numero: varchar({ length: 80 }),
	fechaEmision: date("fecha_emision"),
	fechaVencimiento: date("fecha_vencimiento"),
	documentoUrl: text("documento_url"),
	activa: boolean().default(true),
});

export const platillos = pgTable("platillos", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id").notNull(),
	subcategoriaId: integer("subcategoria_id"),
	codigo: varchar({ length: 30 }),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	descripcionCorta: varchar("descripcion_corta", { length: 255 }),
	imagenUrl: text("imagen_url"),
	precio: numeric({ precision: 10, scale:  2 }).notNull(),
	precioCosto: numeric("precio_costo", { precision: 10, scale:  2 }),
	tiempoPreparacion: integer("tiempo_preparacion"),
	esVegetariano: boolean("es_vegetariano").default(false),
	esVegano: boolean("es_vegano").default(false),
	esSinGluten: boolean("es_sin_gluten").default(false),
	esPicante: boolean("es_picante").default(false),
	nivelPicante: smallint("nivel_picante"),
	esPopular: boolean("es_popular").default(false),
	esNuevo: boolean("es_nuevo").default(false),
	esDelChef: boolean("es_del_chef").default(false),
	disponible: boolean().default(true),
	disponibleTakeout: boolean("disponible_takeout").default(true),
	orden: smallint().default(0),
	notasCocina: text("notas_cocina"),
	fechaAlta: date("fecha_alta").default(sql`CURRENT_DATE`),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_platillos_categoria").using("btree", table.categoriaId.asc().nullsLast().op("int4_ops")),
	index("idx_platillos_disponible").using("btree", table.disponible.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasMenu.id],
			name: "platillos_categoria_id_fkey"
		}),
	foreignKey({
			columns: [table.subcategoriaId],
			foreignColumns: [subcategoriasMenu.id],
			name: "platillos_subcategoria_id_fkey"
		}),
	unique("platillos_codigo_key").on(table.codigo),
	check("platillos_nivel_picante_check", sql`(nivel_picante >= 0) AND (nivel_picante <= 5)`),
]);

export const alergenos = pgTable("alergenos", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	icono: varchar({ length: 10 }),
	color: char({ length: 7 }),
}, (table) => [
	unique("alergenos_nombre_key").on(table.nombre),
]);

export const informacionNutricional = pgTable("informacion_nutricional", {
	id: serial().primaryKey().notNull(),
	platilloId: integer("platillo_id").notNull(),
	porcionGramos: numeric("porcion_gramos", { precision: 7, scale:  2 }),
	calorias: numeric({ precision: 7, scale:  2 }),
	proteinasG: numeric("proteinas_g", { precision: 7, scale:  2 }),
	carbohidratosG: numeric("carbohidratos_g", { precision: 7, scale:  2 }),
	azucaresG: numeric("azucares_g", { precision: 7, scale:  2 }),
	fibraG: numeric("fibra_g", { precision: 7, scale:  2 }),
	grasasTotalesG: numeric("grasas_totales_g", { precision: 7, scale:  2 }),
	grasasSaturadasG: numeric("grasas_saturadas_g", { precision: 7, scale:  2 }),
	sodioMg: numeric("sodio_mg", { precision: 7, scale:  2 }),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "informacion_nutricional_platillo_id_fkey"
		}).onDelete("cascade"),
	unique("informacion_nutricional_platillo_id_key").on(table.platilloId),
]);

export const backups = pgTable("backups", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }).default(0).notNull(),
	driveFileId: varchar("drive_file_id", { length: 255 }),
	driveUrl: text("drive_url"),
	type: varchar({ length: 10 }).default('manual').notNull(),
	status: varchar({ length: 10 }).default('ok').notNull(),
	errorMessage: text("error_message"),
	tables: jsonb(),
	rowCount: integer("row_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const nomina = pgTable("nomina", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	periodoInicio: date("periodo_inicio").notNull(),
	periodoFin: date("periodo_fin").notNull(),
	diasTrabajados: numeric("dias_trabajados", { precision: 5, scale:  2 }),
	horasExtra: numeric("horas_extra", { precision: 6, scale:  2 }).default('0'),
	salarioBase: numeric("salario_base", { precision: 10, scale:  2 }).notNull(),
	bonos: numeric({ precision: 10, scale:  2 }).default('0'),
	propinas: numeric({ precision: 10, scale:  2 }).default('0'),
	descuentoImss: numeric("descuento_imss", { precision: 10, scale:  2 }).default('0'),
	descuentoIsr: numeric("descuento_isr", { precision: 10, scale:  2 }).default('0'),
	otrosDescuentos: numeric("otros_descuentos", { precision: 10, scale:  2 }).default('0'),
	totalPercepciones: numeric("total_percepciones", { precision: 10, scale:  2 }),
	totalDeducciones: numeric("total_deducciones", { precision: 10, scale:  2 }),
	netoPagar: numeric("neto_pagar", { precision: 10, scale:  2 }),
	pagado: boolean().default(false),
	fechaPago: date("fecha_pago"),
	metodoPago: varchar("metodo_pago", { length: 50 }),
	comprobanteUrl: text("comprobante_url"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "nomina_empleado_id_fkey"
		}),
]);

export const variantesPlatillo = pgTable("variantes_platillo", {
	id: serial().primaryKey().notNull(),
	platilloId: integer("platillo_id").notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	precioExtra: numeric("precio_extra", { precision: 10, scale:  2 }).default('0'),
	precioTotal: numeric("precio_total", { precision: 10, scale:  2 }),
	disponible: boolean().default(true),
	orden: smallint().default(0),
}, (table) => [
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "variantes_platillo_platillo_id_fkey"
		}).onDelete("cascade"),
]);

export const modificadores = pgTable("modificadores", {
	id: serial().primaryKey().notNull(),
	grupoId: integer("grupo_id").notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	precioExtra: numeric("precio_extra", { precision: 10, scale:  2 }).default('0'),
	disponible: boolean().default(true),
	orden: smallint().default(0),
}, (table) => [
	foreignKey({
			columns: [table.grupoId],
			foreignColumns: [gruposModificadores.id],
			name: "modificadores_grupo_id_fkey"
		}).onDelete("cascade"),
]);

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	permissions: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_name_key").on(table.name),
]);

export const puestos = pgTable("puestos", {
	id: serial().primaryKey().notNull(),
	departamentoId: integer("departamento_id").notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	nivel: smallint().default(1),
	salarioBase: numeric("salario_base", { precision: 10, scale:  2 }),
	activo: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.departamentoId],
			foreignColumns: [departamentos.id],
			name: "puestos_departamento_id_fkey"
		}),
]);

export const departamentos = pgTable("departamentos", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	activo: boolean().default(true),
}, (table) => [
	unique("departamentos_nombre_key").on(table.nombre),
]);

export const empleados = pgTable("empleados", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: integer("user_id"),
	puestoId: integer("puesto_id"),
	numeroEmpleado: varchar("numero_empleado", { length: 20 }),
	fotoUrl: text("foto_url"),
	fechaNacimiento: date("fecha_nacimiento"),
	genero: varchar({ length: 20 }),
	estadoCivil: varchar("estado_civil", { length: 20 }),
	curp: varchar({ length: 18 }),
	nss: varchar({ length: 15 }),
	rfcEmpleado: varchar("rfc_empleado", { length: 13 }),
	telefonoEmergencia: varchar("telefono_emergencia", { length: 20 }),
	contactoEmergencia: varchar("contacto_emergencia", { length: 150 }),
	direccionEmpleado: text("direccion_empleado"),
	fechaIngreso: date("fecha_ingreso"),
	fechaBaja: date("fecha_baja"),
	tipoContrato: varchar("tipo_contrato", { length: 50 }),
	jornada: varchar({ length: 30 }),
	salarioMensual: numeric("salario_mensual", { precision: 10, scale:  2 }),
	banco: varchar({ length: 80 }),
	clabeInterbancaria: varchar("clabe_interbancaria", { length: 18 }),
	activo: boolean().default(true),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_empleados_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.puestoId],
			foreignColumns: [puestos.id],
			name: "empleados_puesto_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "empleados_user_id_fkey"
		}).onDelete("set null"),
	unique("empleados_user_id_key").on(table.userId),
	unique("empleados_numero_empleado_key").on(table.numeroEmpleado),
	unique("empleados_curp_key").on(table.curp),
	unique("empleados_nss_key").on(table.nss),
	unique("empleados_rfc_empleado_key").on(table.rfcEmpleado),
]);

export const horariosEmpleado = pgTable("horarios_empleado", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	turnoId: integer("turno_id").notNull(),
	diaSemana: smallint("dia_semana").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "horarios_empleado_empleado_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.turnoId],
			foreignColumns: [turnos.id],
			name: "horarios_empleado_turno_id_fkey"
		}),
	unique("horarios_empleado_empleado_id_dia_semana_key").on(table.empleadoId, table.diaSemana),
	check("horarios_empleado_dia_semana_check", sql`(dia_semana >= 0) AND (dia_semana <= 6)`),
]);

export const asistencias = pgTable("asistencias", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	fecha: date().notNull(),
	horaEntrada: timestamp("hora_entrada", { withTimezone: true, mode: 'string' }),
	horaSalida: timestamp("hora_salida", { withTimezone: true, mode: 'string' }),
	tipo: varchar({ length: 30 }).default('normal'),
	justificacion: text(),
	aprobadoPor: uuid("aprobado_por"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asistencias_fecha").using("btree", table.fecha.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.aprobadoPor],
			foreignColumns: [empleados.id],
			name: "asistencias_aprobado_por_fkey"
		}),
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "asistencias_empleado_id_fkey"
		}),
]);

export const vacaciones = pgTable("vacaciones", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	fechaInicio: date("fecha_inicio").notNull(),
	fechaFin: date("fecha_fin").notNull(),
	diasHabiles: integer("dias_habiles"),
	estatus: varchar({ length: 20 }).default('pendiente'),
	aprobadoPor: uuid("aprobado_por"),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.aprobadoPor],
			foreignColumns: [empleados.id],
			name: "vacaciones_aprobado_por_fkey"
		}),
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "vacaciones_empleado_id_fkey"
		}),
]);

export const turnos = pgTable("turnos", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	horaInicio: time("hora_inicio").notNull(),
	horaFin: time("hora_fin").notNull(),
	color: char({ length: 7 }),
	activo: boolean().default(true),
}, (table) => [
	unique("turnos_nombre_key").on(table.nombre),
]);

export const evaluacionesDesempeno = pgTable("evaluaciones_desempeno", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	evaluadorId: uuid("evaluador_id").notNull(),
	periodo: varchar({ length: 20 }),
	puntualidad: smallint(),
	actitud: smallint(),
	productividad: smallint(),
	trabajoEquipo: smallint("trabajo_equipo"),
	conocimiento: smallint(),
	puntajeTotal: numeric("puntaje_total", { precision: 4, scale:  2 }),
	comentarios: text(),
	planMejora: text("plan_mejora"),
	fecha: date().notNull(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "evaluaciones_desempeno_empleado_id_fkey"
		}),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [empleados.id],
			name: "evaluaciones_desempeno_evaluador_id_fkey"
		}),
	check("evaluaciones_desempeno_actitud_check", sql`(actitud >= 1) AND (actitud <= 5)`),
	check("evaluaciones_desempeno_conocimiento_check", sql`(conocimiento >= 1) AND (conocimiento <= 5)`),
	check("evaluaciones_desempeno_productividad_check", sql`(productividad >= 1) AND (productividad <= 5)`),
	check("evaluaciones_desempeno_puntualidad_check", sql`(puntualidad >= 1) AND (puntualidad <= 5)`),
	check("evaluaciones_desempeno_trabajo_equipo_check", sql`(trabajo_equipo >= 1) AND (trabajo_equipo <= 5)`),
]);

export const capacitacionesEmpleado = pgTable("capacitaciones_empleado", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	capacitacionId: integer("capacitacion_id").notNull(),
	fechaCompletado: date("fecha_completado"),
	calificacion: numeric({ precision: 5, scale:  2 }),
	certificadoUrl: text("certificado_url"),
}, (table) => [
	foreignKey({
			columns: [table.capacitacionId],
			foreignColumns: [capacitaciones.id],
			name: "capacitaciones_empleado_capacitacion_id_fkey"
		}),
	foreignKey({
			columns: [table.empleadoId],
			foreignColumns: [empleados.id],
			name: "capacitaciones_empleado_empleado_id_fkey"
		}),
	unique("capacitaciones_empleado_empleado_id_capacitacion_id_key").on(table.empleadoId, table.capacitacionId),
]);

export const capacitaciones = pgTable("capacitaciones", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	duracionHrs: numeric("duracion_hrs", { precision: 5, scale:  1 }),
	instructor: varchar({ length: 150 }),
	fecha: date(),
	obligatoria: boolean().default(false),
	activa: boolean().default(true),
});

export const categoriasMenu = pgTable("categorias_menu", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	imagenUrl: text("imagen_url"),
	orden: smallint().default(0),
	activa: boolean().default(true),
	disponibleDesde: time("disponible_desde"),
	disponibleHasta: time("disponible_hasta"),
	icono: varchar({ length: 50 }),
	color: char({ length: 7 }),
}, (table) => [
	unique("categorias_menu_nombre_key").on(table.nombre),
]);

export const subcategoriasMenu = pgTable("subcategorias_menu", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id").notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	orden: smallint().default(0),
	activa: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasMenu.id],
			name: "subcategorias_menu_categoria_id_fkey"
		}).onDelete("cascade"),
]);

export const gruposModificadores = pgTable("grupos_modificadores", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	tipo: varchar({ length: 20 }).default('single'),
	minimo: smallint().default(0),
	maximo: smallint().default(1),
	obligatorio: boolean().default(false),
	activo: boolean().default(true),
});

export const ingredientes = pgTable("ingredientes", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id"),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	unidadCompraId: integer("unidad_compra_id").notNull(),
	unidadUsoId: integer("unidad_uso_id").notNull(),
	factorConversion: numeric("factor_conversion", { precision: 10, scale:  4 }).default('1'),
	precioUnitario: numeric("precio_unitario", { precision: 10, scale:  4 }),
	stockMinimo: numeric("stock_minimo", { precision: 10, scale:  3 }).default('0'),
	stockMaximo: numeric("stock_maximo", { precision: 10, scale:  3 }),
	stockActual: numeric("stock_actual", { precision: 10, scale:  3 }).default('0'),
	puntoReorden: numeric("punto_reorden", { precision: 10, scale:  3 }),
	esAlergeno: boolean("es_alergeno").default(false),
	alergenoId: integer("alergeno_id"),
	perecedero: boolean().default(false),
	diasCaducidad: integer("dias_caducidad"),
	codigoBarras: varchar("codigo_barras", { length: 50 }),
	activo: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.alergenoId],
			foreignColumns: [alergenos.id],
			name: "ingredientes_alergeno_id_fkey"
		}),
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasIngrediente.id],
			name: "ingredientes_categoria_id_fkey"
		}),
	foreignKey({
			columns: [table.unidadCompraId],
			foreignColumns: [unidadesMedida.id],
			name: "ingredientes_unidad_compra_id_fkey"
		}),
	foreignKey({
			columns: [table.unidadUsoId],
			foreignColumns: [unidadesMedida.id],
			name: "ingredientes_unidad_uso_id_fkey"
		}),
]);

export const recetas = pgTable("recetas", {
	id: serial().primaryKey().notNull(),
	platilloId: integer("platillo_id").notNull(),
	varianteId: integer("variante_id"),
	version: smallint().default(1),
	activa: boolean().default(true),
	costoCalculado: numeric("costo_calculado", { precision: 10, scale:  4 }),
	margenPct: numeric("margen_pct", { precision: 5, scale:  2 }),
	procedimiento: text(),
	fotoEmplatado: text("foto_emplatado"),
	tiempoPrepMin: integer("tiempo_prep_min"),
	porcionGramos: numeric("porcion_gramos", { precision: 7, scale:  2 }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "recetas_platillo_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.varianteId],
			foreignColumns: [variantesPlatillo.id],
			name: "recetas_variante_id_fkey"
		}),
]);

export const recetasIngredientes = pgTable("recetas_ingredientes", {
	id: serial().primaryKey().notNull(),
	recetaId: integer("receta_id").notNull(),
	ingredienteId: integer("ingrediente_id").notNull(),
	cantidad: numeric({ precision: 10, scale:  4 }).notNull(),
	unidadId: integer("unidad_id").notNull(),
	esOpcional: boolean("es_opcional").default(false),
	notas: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.ingredienteId],
			foreignColumns: [ingredientes.id],
			name: "recetas_ingredientes_ingrediente_id_fkey"
		}),
	foreignKey({
			columns: [table.recetaId],
			foreignColumns: [recetas.id],
			name: "recetas_ingredientes_receta_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unidadId],
			foreignColumns: [unidadesMedida.id],
			name: "recetas_ingredientes_unidad_id_fkey"
		}),
	unique("recetas_ingredientes_receta_id_ingrediente_id_key").on(table.recetaId, table.ingredienteId),
]);

export const proveedores = pgTable("proveedores", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	nombreContacto: varchar("nombre_contacto", { length: 150 }),
	rfc: varchar({ length: 20 }),
	email: varchar({ length: 150 }),
	telefono: varchar({ length: 20 }),
	whatsapp: varchar({ length: 20 }),
	sitioWeb: varchar("sitio_web", { length: 255 }),
	direccion: text(),
	ciudad: varchar({ length: 100 }),
	diasCredito: integer("dias_credito").default(0),
	calificacion: numeric({ precision: 3, scale:  1 }),
	activo: boolean().default(true),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("proveedores_calificacion_check", sql`(calificacion >= (0)::numeric) AND (calificacion <= (5)::numeric)`),
]);

export const unidadesMedida = pgTable("unidades_medida", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 50 }).notNull(),
	abreviatura: varchar({ length: 10 }).notNull(),
	tipo: varchar({ length: 20 }),
}, (table) => [
	unique("unidades_medida_nombre_key").on(table.nombre),
	unique("unidades_medida_abreviatura_key").on(table.abreviatura),
]);

export const categoriasIngrediente = pgTable("categorias_ingrediente", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	icono: varchar({ length: 50 }),
}, (table) => [
	unique("categorias_ingrediente_nombre_key").on(table.nombre),
]);

export const ordenesCompra = pgTable("ordenes_compra", {
	id: serial().primaryKey().notNull(),
	proveedorId: integer("proveedor_id").notNull(),
	folio: varchar({ length: 30 }),
	fechaOrden: date("fecha_orden").default(sql`CURRENT_DATE`).notNull(),
	fechaEsperada: date("fecha_esperada"),
	fechaRecibida: date("fecha_recibida"),
	estatus: varchar({ length: 30 }).default('borrador'),
	subtotal: numeric({ precision: 12, scale:  2 }),
	iva: numeric({ precision: 12, scale:  2 }),
	total: numeric({ precision: 12, scale:  2 }),
	notas: text(),
	creadoPor: integer("creado_por"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.creadoPor],
			foreignColumns: [users.id],
			name: "ordenes_compra_creado_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.proveedorId],
			foreignColumns: [proveedores.id],
			name: "ordenes_compra_proveedor_id_fkey"
		}),
	unique("ordenes_compra_folio_key").on(table.folio),
]);

export const ordenesCompraItems = pgTable("ordenes_compra_items", {
	id: serial().primaryKey().notNull(),
	ordenCompraId: integer("orden_compra_id").notNull(),
	ingredienteId: integer("ingrediente_id").notNull(),
	cantidadPedida: numeric("cantidad_pedida", { precision: 10, scale:  3 }).notNull(),
	cantidadRecibida: numeric("cantidad_recibida", { precision: 10, scale:  3 }).default('0'),
	unidadId: integer("unidad_id").notNull(),
	precioUnitario: numeric("precio_unitario", { precision: 10, scale:  4 }).notNull(),
	subtotal: numeric({ precision: 12, scale:  4 }),
	notas: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.ingredienteId],
			foreignColumns: [ingredientes.id],
			name: "ordenes_compra_items_ingrediente_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenCompraId],
			foreignColumns: [ordenesCompra.id],
			name: "ordenes_compra_items_orden_compra_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unidadId],
			foreignColumns: [unidadesMedida.id],
			name: "ordenes_compra_items_unidad_id_fkey"
		}),
]);

export const movimientosInventario = pgTable("movimientos_inventario", {
	id: serial().primaryKey().notNull(),
	ingredienteId: integer("ingrediente_id").notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	cantidad: numeric({ precision: 10, scale:  3 }).notNull(),
	unidadId: integer("unidad_id").notNull(),
	stockAnterior: numeric("stock_anterior", { precision: 10, scale:  3 }),
	stockNuevo: numeric("stock_nuevo", { precision: 10, scale:  3 }),
	costoUnitario: numeric("costo_unitario", { precision: 10, scale:  4 }),
	costoTotal: numeric("costo_total", { precision: 12, scale:  4 }),
	referenciaId: integer("referencia_id"),
	referenciaTipo: varchar("referencia_tipo", { length: 30 }),
	userId: integer("user_id"),
	fecha: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	notas: text(),
}, (table) => [
	index("idx_movimientos_fecha").using("btree", table.fecha.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.ingredienteId],
			foreignColumns: [ingredientes.id],
			name: "movimientos_inventario_ingrediente_id_fkey"
		}),
	foreignKey({
			columns: [table.unidadId],
			foreignColumns: [unidadesMedida.id],
			name: "movimientos_inventario_unidad_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "movimientos_inventario_user_id_fkey"
		}).onDelete("set null"),
]);

export const conteosInventario = pgTable("conteos_inventario", {
	id: serial().primaryKey().notNull(),
	fecha: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	estatus: varchar({ length: 20 }).default('en_proceso'),
	userId: integer("user_id"),
	notas: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conteos_inventario_user_id_fkey"
		}).onDelete("set null"),
]);

export const conteosInventarioItems = pgTable("conteos_inventario_items", {
	id: serial().primaryKey().notNull(),
	conteoId: integer("conteo_id").notNull(),
	ingredienteId: integer("ingrediente_id").notNull(),
	stockSistema: numeric("stock_sistema", { precision: 10, scale:  3 }),
	stockFisico: numeric("stock_fisico", { precision: 10, scale:  3 }),
	diferencia: numeric({ precision: 10, scale:  3 }),
	costoDiferencia: numeric("costo_diferencia", { precision: 12, scale:  4 }),
}, (table) => [
	foreignKey({
			columns: [table.conteoId],
			foreignColumns: [conteosInventario.id],
			name: "conteos_inventario_items_conteo_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ingredienteId],
			foreignColumns: [ingredientes.id],
			name: "conteos_inventario_items_ingrediente_id_fkey"
		}),
]);

export const areasSalon = pgTable("areas_salon", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	capacidad: integer(),
	piso: smallint().default(1),
	activa: boolean().default(true),
	imagenUrl: text("imagen_url"),
}, (table) => [
	unique("areas_salon_nombre_key").on(table.nombre),
]);

export const mesas = pgTable("mesas", {
	id: serial().primaryKey().notNull(),
	areaId: integer("area_id"),
	numero: varchar({ length: 10 }).notNull(),
	nombre: varchar({ length: 50 }),
	capacidad: smallint().notNull(),
	forma: varchar({ length: 20 }).default('cuadrada'),
	posicionX: integer("posicion_x"),
	posicionY: integer("posicion_y"),
	qrCodeUrl: text("qr_code_url"),
	activa: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.areaId],
			foreignColumns: [areasSalon.id],
			name: "mesas_area_id_fkey"
		}),
	unique("mesas_numero_key").on(table.numero),
]);

export const programaLealtad = pgTable("programa_lealtad", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).default('Club El Quijote').notNull(),
	descripcion: text(),
	puntosPorPeso: numeric("puntos_por_peso", { precision: 6, scale:  4 }).default('0.10'),
	valorPunto: numeric("valor_punto", { precision: 8, scale:  4 }).default('0.10'),
	minimoCanje: integer("minimo_canje").default(50),
	activo: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const nivelesLealtad = pgTable("niveles_lealtad", {
	id: serial().primaryKey().notNull(),
	programaId: integer("programa_id").notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	puntosMinimos: integer("puntos_minimos").notNull(),
	descuentoPct: numeric("descuento_pct", { precision: 5, scale:  2 }).default('0'),
	multiplicador: numeric({ precision: 4, scale:  2 }).default('1'),
	beneficios: text(),
	color: char({ length: 7 }),
	icono: varchar({ length: 50 }),
}, (table) => [
	foreignKey({
			columns: [table.programaId],
			foreignColumns: [programaLealtad.id],
			name: "niveles_lealtad_programa_id_fkey"
		}),
]);

export const direccionesCliente = pgTable("direcciones_cliente", {
	id: serial().primaryKey().notNull(),
	clienteId: uuid("cliente_id").notNull(),
	alias: varchar({ length: 60 }).default('Casa'),
	linea1: varchar({ length: 200 }).notNull(),
	linea2: varchar({ length: 200 }),
	colonia: varchar({ length: 100 }),
	referencias: text(),
	esPrincipal: boolean("es_principal").default(false),
}, (table) => [
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "direcciones_cliente_cliente_id_fkey"
		}).onDelete("cascade"),
]);

export const metodosPago = pgTable("metodos_pago", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	tipo: varchar({ length: 30 }),
	activo: boolean().default(true),
	aplicaPropina: boolean("aplica_propina").default(true),
	comisionPct: numeric("comision_pct", { precision: 5, scale:  3 }).default('0'),
}, (table) => [
	unique("metodos_pago_nombre_key").on(table.nombre),
]);

export const categoriasGasto = pgTable("categorias_gasto", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	tipo: varchar({ length: 20 }).default('variable'),
}, (table) => [
	unique("categorias_gasto_nombre_key").on(table.nombre),
]);

export const presupuestos = pgTable("presupuestos", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id").notNull(),
	anio: smallint().notNull(),
	mes: smallint().notNull(),
	monto: numeric({ precision: 12, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasGasto.id],
			name: "presupuestos_categoria_id_fkey"
		}),
	unique("presupuestos_categoria_id_anio_mes_key").on(table.categoriaId, table.anio, table.mes),
	check("presupuestos_mes_check", sql`(mes >= 1) AND (mes <= 12)`),
]);

export const cortesDiarios = pgTable("cortes_diarios", {
	id: serial().primaryKey().notNull(),
	fecha: date().notNull(),
	totalOrdenes: integer("total_ordenes").default(0),
	ticketPromedio: numeric("ticket_promedio", { precision: 10, scale:  2 }),
	totalVentas: numeric("total_ventas", { precision: 12, scale:  2 }).default('0'),
	totalEfectivo: numeric("total_efectivo", { precision: 12, scale:  2 }).default('0'),
	totalTarjeta: numeric("total_tarjeta", { precision: 12, scale:  2 }).default('0'),
	totalDigital: numeric("total_digital", { precision: 12, scale:  2 }).default('0'),
	totalDescuentos: numeric("total_descuentos", { precision: 12, scale:  2 }).default('0'),
	totalImpuestos: numeric("total_impuestos", { precision: 12, scale:  2 }).default('0'),
	totalPropinas: numeric("total_propinas", { precision: 12, scale:  2 }).default('0'),
	costoAlimentos: numeric("costo_alimentos", { precision: 12, scale:  2 }).default('0'),
	costoManoObra: numeric("costo_mano_obra", { precision: 12, scale:  2 }).default('0'),
	otrosGastos: numeric("otros_gastos", { precision: 12, scale:  2 }).default('0'),
	utilidadBruta: numeric("utilidad_bruta", { precision: 12, scale:  2 }),
	generadoEn: timestamp("generado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("cortes_diarios_fecha_key").on(table.fecha),
]);

export const gastos = pgTable("gastos", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id").notNull(),
	concepto: varchar({ length: 200 }).notNull(),
	monto: numeric({ precision: 12, scale:  2 }).notNull(),
	iva: numeric({ precision: 12, scale:  2 }).default('0'),
	total: numeric({ precision: 12, scale:  2 }),
	fecha: date().default(sql`CURRENT_DATE`).notNull(),
	proveedorId: integer("proveedor_id"),
	metodoPagoId: integer("metodo_pago_id"),
	folioFactura: varchar("folio_factura", { length: 80 }),
	comprobanteUrl: text("comprobante_url"),
	recurrente: boolean().default(false),
	registradoPor: integer("registrado_por"),
	aprobadoPor: integer("aprobado_por"),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.aprobadoPor],
			foreignColumns: [users.id],
			name: "gastos_aprobado_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasGasto.id],
			name: "gastos_categoria_id_fkey"
		}),
	foreignKey({
			columns: [table.metodoPagoId],
			foreignColumns: [metodosPago.id],
			name: "gastos_metodo_pago_id_fkey"
		}),
	foreignKey({
			columns: [table.proveedorId],
			foreignColumns: [proveedores.id],
			name: "gastos_proveedor_id_fkey"
		}),
	foreignKey({
			columns: [table.registradoPor],
			foreignColumns: [users.id],
			name: "gastos_registrado_por_fkey"
		}).onDelete("set null"),
]);

export const campanas = pgTable("campanas", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	canal: varchar({ length: 50 }),
	objetivo: varchar({ length: 80 }),
	presupuesto: numeric({ precision: 12, scale:  2 }),
	fechaInicio: date("fecha_inicio"),
	fechaFin: date("fecha_fin"),
	estatus: varchar({ length: 20 }).default('borrador'),
	enviados: integer().default(0),
	conversiones: integer().default(0),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const resenas = pgTable("resenas", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	ordenId: uuid("orden_id"),
	nombreCliente: varchar("nombre_cliente", { length: 150 }),
	plataforma: varchar({ length: 50 }).default('interna'),
	calificacionGeneral: smallint("calificacion_general"),
	calificacionComida: smallint("calificacion_comida"),
	calificacionServicio: smallint("calificacion_servicio"),
	calificacionAmbiente: smallint("calificacion_ambiente"),
	calificacionPrecio: smallint("calificacion_precio"),
	comentario: text(),
	respuesta: text(),
	respondidoPor: integer("respondido_por"),
	fechaRespuesta: timestamp("fecha_respuesta", { withTimezone: true, mode: 'string' }),
	visible: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "resenas_orden_id_fkey"
		}),
	foreignKey({
			columns: [table.respondidoPor],
			foreignColumns: [users.id],
			name: "resenas_respondido_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "resenas_user_id_fkey"
		}).onDelete("set null"),
	check("resenas_calificacion_ambiente_check", sql`(calificacion_ambiente >= 1) AND (calificacion_ambiente <= 5)`),
	check("resenas_calificacion_comida_check", sql`(calificacion_comida >= 1) AND (calificacion_comida <= 5)`),
	check("resenas_calificacion_general_check", sql`(calificacion_general >= 1) AND (calificacion_general <= 5)`),
	check("resenas_calificacion_precio_check", sql`(calificacion_precio >= 1) AND (calificacion_precio <= 5)`),
	check("resenas_calificacion_servicio_check", sql`(calificacion_servicio >= 1) AND (calificacion_servicio <= 5)`),
]);

export const respuestasEncuesta = pgTable("respuestas_encuesta", {
	id: serial().primaryKey().notNull(),
	encuestaId: integer("encuesta_id").notNull(),
	userId: integer("user_id"),
	ordenId: uuid("orden_id"),
	respuestas: jsonb(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.encuestaId],
			foreignColumns: [encuestasSatisfaccion.id],
			name: "respuestas_encuesta_encuesta_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "respuestas_encuesta_orden_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "respuestas_encuesta_user_id_fkey"
		}).onDelete("set null"),
]);

export const encuestasSatisfaccion = pgTable("encuestas_satisfaccion", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	activa: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const preguntasEncuesta = pgTable("preguntas_encuesta", {
	id: serial().primaryKey().notNull(),
	encuestaId: integer("encuesta_id").notNull(),
	pregunta: text().notNull(),
	tipo: varchar({ length: 30 }).default('escala'),
	opciones: jsonb(),
	obligatoria: boolean().default(true),
	orden: smallint().default(0),
}, (table) => [
	foreignKey({
			columns: [table.encuestaId],
			foreignColumns: [encuestasSatisfaccion.id],
			name: "preguntas_encuesta_encuesta_id_fkey"
		}).onDelete("cascade"),
]);

export const logsAuditoria = pgTable("logs_auditoria", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: integer("user_id"),
	tabla: varchar({ length: 80 }),
	registroId: varchar("registro_id", { length: 80 }),
	accion: varchar({ length: 20 }).notNull(),
	datosAntes: jsonb("datos_antes"),
	datosDespues: jsonb("datos_despues"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_logs_fecha").using("btree", table.creadoEn.asc().nullsLast().op("timestamptz_ops")),
	index("idx_logs_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "logs_auditoria_user_id_fkey"
		}).onDelete("set null"),
]);

export const notificaciones = pgTable("notificaciones", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	tipo: varchar({ length: 50 }),
	titulo: varchar({ length: 150 }),
	mensaje: text(),
	leida: boolean().default(false),
	urlAccion: text("url_accion"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notificaciones_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notificaciones_user_id_fkey"
		}).onDelete("cascade"),
]);

export const combos = pgTable("combos", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	precio: numeric({ precision: 10, scale:  2 }).notNull(),
	precioRegular: numeric("precio_regular", { precision: 10, scale:  2 }),
	imagenUrl: text("imagen_url"),
	disponible: boolean().default(true),
	fechaInicio: date("fecha_inicio"),
	fechaFin: date("fecha_fin"),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const combosItems = pgTable("combos_items", {
	id: serial().primaryKey().notNull(),
	comboId: integer("combo_id").notNull(),
	platilloId: integer("platillo_id").notNull(),
	cantidad: smallint().default(1),
	obligatorio: boolean().default(true),
	orden: smallint().default(0),
}, (table) => [
	foreignKey({
			columns: [table.comboId],
			foreignColumns: [combos.id],
			name: "combos_items_combo_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "combos_items_platillo_id_fkey"
		}),
]);

export const menusDelDia = pgTable("menus_del_dia", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	fecha: date().notNull(),
	precio: numeric({ precision: 10, scale:  2 }).notNull(),
	incluyeBebida: boolean("incluye_bebida").default(false),
	incluyePostre: boolean("incluye_postre").default(false),
	disponible: boolean().default(true),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const menusDelDiaItems = pgTable("menus_del_dia_items", {
	id: serial().primaryKey().notNull(),
	menuDiaId: integer("menu_dia_id").notNull(),
	platilloId: integer("platillo_id").notNull(),
	tipo: varchar({ length: 30 }),
	orden: smallint().default(0),
}, (table) => [
	foreignKey({
			columns: [table.menuDiaId],
			foreignColumns: [menusDelDia.id],
			name: "menus_del_dia_items_menu_dia_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "menus_del_dia_items_platillo_id_fkey"
		}),
]);

export const preferenciasCliente = pgTable("preferencias_cliente", {
	id: serial().primaryKey().notNull(),
	clienteId: uuid("cliente_id").notNull(),
	alergenos: integer().array().default([]),
	dieta: varchar({ length: 50 }),
	mesaPreferida: integer("mesa_preferida"),
	bebidaFavorita: varchar("bebida_favorita", { length: 150 }),
	platilloFavorito: integer("platillo_favorito"),
	notas: text(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "preferencias_cliente_cliente_id_fkey"
		}),
	foreignKey({
			columns: [table.mesaPreferida],
			foreignColumns: [mesas.id],
			name: "preferencias_cliente_mesa_preferida_fkey"
		}),
	foreignKey({
			columns: [table.platilloFavorito],
			foreignColumns: [platillos.id],
			name: "preferencias_cliente_platillo_favorito_fkey"
		}),
	unique("preferencias_cliente_cliente_id_key").on(table.clienteId),
]);

export const cupones = pgTable("cupones", {
	id: serial().primaryKey().notNull(),
	codigo: varchar({ length: 30 }).notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	tipo: varchar({ length: 30 }).notNull(),
	valor: numeric({ precision: 10, scale:  2 }),
	minimoCompra: numeric("minimo_compra", { precision: 10, scale:  2 }).default('0'),
	maximoDescuento: numeric("maximo_descuento", { precision: 10, scale:  2 }),
	usosMaximos: integer("usos_maximos"),
	usosPorCliente: smallint("usos_por_cliente").default(1),
	usosActuales: integer("usos_actuales").default(0),
	fechaInicio: date("fecha_inicio"),
	fechaFin: date("fecha_fin"),
	activo: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("cupones_codigo_key").on(table.codigo),
]);

export const comandas = pgTable("comandas", {
	id: serial().primaryKey().notNull(),
	ordenId: uuid("orden_id").notNull(),
	estacionId: integer("estacion_id").notNull(),
	folioComanda: varchar("folio_comanda", { length: 20 }),
	estatus: varchar({ length: 30 }).default('pendiente'),
	prioridad: smallint().default(0),
	tiempoInicio: timestamp("tiempo_inicio", { withTimezone: true, mode: 'string' }),
	tiempoListo: timestamp("tiempo_listo", { withTimezone: true, mode: 'string' }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.estacionId],
			foreignColumns: [estacionesCocina.id],
			name: "comandas_estacion_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "comandas_orden_id_fkey"
		}),
]);

export const estacionesCocina = pgTable("estaciones_cocina", {
	id: serial().primaryKey().notNull(),
	nombre: varchar({ length: 80 }).notNull(),
	descripcion: text(),
	impresora: varchar({ length: 80 }),
	color: char({ length: 7 }),
	activa: boolean().default(true),
}, (table) => [
	unique("estaciones_cocina_nombre_key").on(table.nombre),
]);

export const ordenes = pgTable("ordenes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	folio: varchar({ length: 30 }),
	tipo: varchar({ length: 30 }).default('mesa').notNull(),
	mesaId: integer("mesa_id"),
	clienteId: uuid("cliente_id"),
	reservacionId: uuid("reservacion_id"),
	atendidoPor: integer("atendido_por"),
	numComensales: smallint("num_comensales").default(1),
	estatus: varchar({ length: 30 }).default('abierta'),
	subtotal: numeric({ precision: 12, scale:  2 }).default('0'),
	descuentos: numeric({ precision: 12, scale:  2 }).default('0'),
	impuestos: numeric({ precision: 12, scale:  2 }).default('0'),
	propina: numeric({ precision: 12, scale:  2 }).default('0'),
	total: numeric({ precision: 12, scale:  2 }).default('0'),
	notasCliente: text("notas_cliente"),
	notasCocina: text("notas_cocina"),
	prioridad: smallint().default(0),
	tiempoApertura: timestamp("tiempo_apertura", { withTimezone: true, mode: 'string' }).defaultNow(),
	tiempoCierre: timestamp("tiempo_cierre", { withTimezone: true, mode: 'string' }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ordenes_atendido_por").using("btree", table.atendidoPor.asc().nullsLast().op("int4_ops")),
	index("idx_ordenes_estatus").using("btree", table.estatus.asc().nullsLast().op("text_ops")),
	index("idx_ordenes_fecha").using("btree", table.creadoEn.asc().nullsLast().op("timestamptz_ops")),
	index("idx_ordenes_mesa").using("btree", table.mesaId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.atendidoPor],
			foreignColumns: [users.id],
			name: "ordenes_atendido_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "ordenes_cliente_id_fkey"
		}),
	foreignKey({
			columns: [table.mesaId],
			foreignColumns: [mesas.id],
			name: "ordenes_mesa_id_fkey"
		}),
	foreignKey({
			columns: [table.reservacionId],
			foreignColumns: [reservaciones.id],
			name: "ordenes_reservacion_id_fkey"
		}),
	unique("ordenes_folio_key").on(table.folio),
]);

export const ordenItems = pgTable("orden_items", {
	id: serial().primaryKey().notNull(),
	ordenId: uuid("orden_id").notNull(),
	platilloId: integer("platillo_id").notNull(),
	varianteId: integer("variante_id"),
	comboId: integer("combo_id"),
	cantidad: smallint().default(1).notNull(),
	precioUnitario: numeric("precio_unitario", { precision: 10, scale:  2 }).notNull(),
	descuento: numeric({ precision: 10, scale:  2 }).default('0'),
	subtotal: numeric({ precision: 10, scale:  2 }),
	estatus: varchar({ length: 30 }).default('pendiente'),
	estacionId: integer("estacion_id"),
	notas: text(),
	enviadoCocina: boolean("enviado_cocina").default(false),
	tiempoEnvio: timestamp("tiempo_envio", { withTimezone: true, mode: 'string' }),
	tiempoListo: timestamp("tiempo_listo", { withTimezone: true, mode: 'string' }),
	tiempoEntrega: timestamp("tiempo_entrega", { withTimezone: true, mode: 'string' }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_orden_items_orden").using("btree", table.ordenId.asc().nullsLast().op("uuid_ops")),
	index("idx_orden_items_platillo").using("btree", table.platilloId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.comboId],
			foreignColumns: [combos.id],
			name: "orden_items_combo_id_fkey"
		}),
	foreignKey({
			columns: [table.estacionId],
			foreignColumns: [estacionesCocina.id],
			name: "orden_items_estacion_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "orden_items_orden_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "orden_items_platillo_id_fkey"
		}),
	foreignKey({
			columns: [table.varianteId],
			foreignColumns: [variantesPlatillo.id],
			name: "orden_items_variante_id_fkey"
		}),
]);

export const ordenItemModificadores = pgTable("orden_item_modificadores", {
	id: serial().primaryKey().notNull(),
	ordenItemId: integer("orden_item_id").notNull(),
	modificadorId: integer("modificador_id").notNull(),
	precioExtra: numeric("precio_extra", { precision: 10, scale:  2 }).default('0'),
	cantidad: smallint().default(1),
}, (table) => [
	foreignKey({
			columns: [table.modificadorId],
			foreignColumns: [modificadores.id],
			name: "orden_item_modificadores_modificador_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenItemId],
			foreignColumns: [ordenItems.id],
			name: "orden_item_modificadores_orden_item_id_fkey"
		}).onDelete("cascade"),
]);

export const historialEstatusOrden = pgTable("historial_estatus_orden", {
	id: serial().primaryKey().notNull(),
	ordenId: uuid("orden_id").notNull(),
	estatus: varchar({ length: 30 }).notNull(),
	userId: integer("user_id"),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "historial_estatus_orden_orden_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "historial_estatus_orden_user_id_fkey"
		}).onDelete("set null"),
]);

export const pagos = pgTable("pagos", {
	id: serial().primaryKey().notNull(),
	ordenId: uuid("orden_id").notNull(),
	metodoPagoId: integer("metodo_pago_id").notNull(),
	monto: numeric({ precision: 12, scale:  2 }).notNull(),
	cambio: numeric({ precision: 12, scale:  2 }).default('0'),
	referencia: varchar({ length: 100 }),
	propina: numeric({ precision: 12, scale:  2 }).default('0'),
	cobradoPor: integer("cobrado_por"),
	estatus: varchar({ length: 20 }).default('completado'),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pagos_orden").using("btree", table.ordenId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.cobradoPor],
			foreignColumns: [users.id],
			name: "pagos_cobrado_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.metodoPagoId],
			foreignColumns: [metodosPago.id],
			name: "pagos_metodo_pago_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "pagos_orden_id_fkey"
		}),
]);

export const estatusMesa = pgTable("estatus_mesa", {
	id: serial().primaryKey().notNull(),
	mesaId: integer("mesa_id").notNull(),
	estatus: varchar({ length: 30 }).default('disponible'),
	ordenId: uuid("orden_id"),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.mesaId],
			foreignColumns: [mesas.id],
			name: "estatus_mesa_mesa_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "fk_estatus_mesa_orden"
		}).onDelete("set null"),
	unique("estatus_mesa_mesa_id_key").on(table.mesaId),
]);

export const reservaciones = pgTable("reservaciones", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	mesaId: integer("mesa_id"),
	userId: integer("user_id"),
	clienteNombre: varchar("cliente_nombre", { length: 150 }).notNull(),
	clienteTelefono: varchar("cliente_telefono", { length: 20 }),
	clienteEmail: varchar("cliente_email", { length: 150 }),
	fechaHora: timestamp("fecha_hora", { withTimezone: true, mode: 'string' }).notNull(),
	duracionMin: integer("duracion_min").default(90),
	numComensales: smallint("num_comensales").notNull(),
	ocasion: varchar({ length: 80 }),
	peticionesEspeciales: text("peticiones_especiales"),
	estatus: varchar({ length: 30 }).default('confirmada'),
	canal: varchar({ length: 30 }).default('telefono'),
	recordatorioEnviado: boolean("recordatorio_enviado").default(false),
	noShow: boolean("no_show").default(false),
	depositoRequerido: numeric("deposito_requerido", { precision: 10, scale:  2 }).default('0'),
	depositoPagado: numeric("deposito_pagado", { precision: 10, scale:  2 }).default('0'),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reservaciones_fecha").using("btree", table.fechaHora.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.mesaId],
			foreignColumns: [mesas.id],
			name: "reservaciones_mesa_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reservaciones_user_id_fkey"
		}).onDelete("set null"),
]);

export const cierresCaja = pgTable("cierres_caja", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	fechaApertura: timestamp("fecha_apertura", { withTimezone: true, mode: 'string' }).notNull(),
	fechaCierre: timestamp("fecha_cierre", { withTimezone: true, mode: 'string' }),
	fondoInicial: numeric("fondo_inicial", { precision: 12, scale:  2 }).default('0'),
	efectivoVentas: numeric("efectivo_ventas", { precision: 12, scale:  2 }).default('0'),
	tarjetaVentas: numeric("tarjeta_ventas", { precision: 12, scale:  2 }).default('0'),
	digitalVentas: numeric("digital_ventas", { precision: 12, scale:  2 }).default('0'),
	totalVentas: numeric("total_ventas", { precision: 12, scale:  2 }).default('0'),
	efectivoContado: numeric("efectivo_contado", { precision: 12, scale:  2 }),
	diferencia: numeric({ precision: 12, scale:  2 }),
	propinas: numeric({ precision: 12, scale:  2 }).default('0'),
	notas: text(),
	estatus: varchar({ length: 20 }).default('abierto'),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cierres_caja_user_id_fkey"
		}).onDelete("set null"),
]);

export const facturas = pgTable("facturas", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	ordenId: uuid("orden_id").notNull(),
	userId: integer("user_id"),
	folioFiscal: varchar("folio_fiscal", { length: 50 }),
	serie: varchar({ length: 5 }),
	folio: varchar({ length: 20 }),
	rfcEmisor: varchar("rfc_emisor", { length: 13 }),
	rfcReceptor: varchar("rfc_receptor", { length: 13 }).notNull(),
	razonSocial: varchar("razon_social", { length: 200 }).notNull(),
	usoCfdi: varchar("uso_cfdi", { length: 10 }),
	regimenFiscal: varchar("regimen_fiscal", { length: 50 }),
	subtotal: numeric({ precision: 12, scale:  2 }),
	iva: numeric({ precision: 12, scale:  2 }),
	total: numeric({ precision: 12, scale:  2 }),
	xmlUrl: text("xml_url"),
	pdfUrl: text("pdf_url"),
	estatus: varchar({ length: 20 }).default('vigente'),
	fechaEmision: timestamp("fecha_emision", { withTimezone: true, mode: 'string' }).defaultNow(),
	fechaCancelacion: timestamp("fecha_cancelacion", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "facturas_orden_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "facturas_user_id_fkey"
		}).onDelete("set null"),
	unique("facturas_folio_fiscal_key").on(table.folioFiscal),
]);

export const reembolsos = pgTable("reembolsos", {
	id: serial().primaryKey().notNull(),
	pagoId: integer("pago_id").notNull(),
	monto: numeric({ precision: 12, scale:  2 }).notNull(),
	motivo: text(),
	aprobadoPor: integer("aprobado_por"),
	metodoDevolucion: varchar("metodo_devolucion", { length: 50 }),
	referencia: varchar({ length: 100 }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.aprobadoPor],
			foreignColumns: [users.id],
			name: "reembolsos_aprobado_por_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.pagoId],
			foreignColumns: [pagos.id],
			name: "reembolsos_pago_id_fkey"
		}),
]);

export const cuponesUsos = pgTable("cupones_usos", {
	id: serial().primaryKey().notNull(),
	cuponId: integer("cupon_id").notNull(),
	ordenId: uuid("orden_id").notNull(),
	userId: integer("user_id"),
	descuento: numeric({ precision: 10, scale:  2 }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.cuponId],
			foreignColumns: [cupones.id],
			name: "cupones_usos_cupon_id_fkey"
		}),
	foreignKey({
			columns: [table.ordenId],
			foreignColumns: [ordenes.id],
			name: "cupones_usos_orden_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cupones_usos_user_id_fkey"
		}).onDelete("set null"),
]);

export const clientes = pgTable("clientes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: integer("user_id"),
	rfc: varchar({ length: 13 }),
	razonSocial: varchar("razon_social", { length: 200 }),
	requiereFactura: boolean("requiere_factura").default(false),
	notas: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_clientes_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clientes_user_id_fkey"
		}).onDelete("set null"),
	unique("clientes_user_id_key").on(table.userId),
]);

export const cuentasLealtad = pgTable("cuentas_lealtad", {
	id: serial().primaryKey().notNull(),
	clienteId: uuid("cliente_id").notNull(),
	nivelId: integer("nivel_id"),
	puntosAcumulados: integer("puntos_acumulados").default(0),
	puntosCanjeados: integer("puntos_canjeados").default(0),
	puntosDisponibles: integer("puntos_disponibles").default(0),
	totalGastado: numeric("total_gastado", { precision: 12, scale:  2 }).default('0'),
	visitas: integer().default(0),
	ultimaVisita: timestamp("ultima_visita", { withTimezone: true, mode: 'string' }),
	activa: boolean().default(true),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "cuentas_lealtad_cliente_id_fkey"
		}),
	foreignKey({
			columns: [table.nivelId],
			foreignColumns: [nivelesLealtad.id],
			name: "cuentas_lealtad_nivel_id_fkey"
		}),
	unique("cuentas_lealtad_cliente_id_key").on(table.clienteId),
]);

export const transaccionesLealtad = pgTable("transacciones_lealtad", {
	id: serial().primaryKey().notNull(),
	cuentaId: integer("cuenta_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	puntos: integer().notNull(),
	balanceAntes: integer("balance_antes"),
	balanceDespues: integer("balance_despues"),
	referencia: varchar({ length: 100 }),
	descripcion: text(),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.cuentaId],
			foreignColumns: [cuentasLealtad.id],
			name: "transacciones_lealtad_cuenta_id_fkey"
		}),
]);

export const platillosAlergenos = pgTable("platillos_alergenos", {
	platilloId: integer("platillo_id").notNull(),
	alergenoId: integer("alergeno_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.alergenoId],
			foreignColumns: [alergenos.id],
			name: "platillos_alergenos_alergeno_id_fkey"
		}),
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "platillos_alergenos_platillo_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.platilloId, table.alergenoId], name: "platillos_alergenos_pkey"}),
]);

export const platillosModificadores = pgTable("platillos_modificadores", {
	platilloId: integer("platillo_id").notNull(),
	grupoId: integer("grupo_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.grupoId],
			foreignColumns: [gruposModificadores.id],
			name: "platillos_modificadores_grupo_id_fkey"
		}),
	foreignKey({
			columns: [table.platilloId],
			foreignColumns: [platillos.id],
			name: "platillos_modificadores_platillo_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.platilloId, table.grupoId], name: "platillos_modificadores_pkey"}),
]);

export const categoriasEstacion = pgTable("categorias_estacion", {
	estacionId: integer("estacion_id").notNull(),
	categoriaId: integer("categoria_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [categoriasMenu.id],
			name: "categorias_estacion_categoria_id_fkey"
		}),
	foreignKey({
			columns: [table.estacionId],
			foreignColumns: [estacionesCocina.id],
			name: "categorias_estacion_estacion_id_fkey"
		}),
	primaryKey({ columns: [table.estacionId, table.categoriaId], name: "categorias_estacion_pkey"}),
]);

export const proveedoresIngredientes = pgTable("proveedores_ingredientes", {
	proveedorId: integer("proveedor_id").notNull(),
	ingredienteId: integer("ingrediente_id").notNull(),
	precio: numeric({ precision: 10, scale:  4 }).notNull(),
	unidadId: integer("unidad_id").notNull(),
	tiempoEntrega: integer("tiempo_entrega"),
	esPrincipal: boolean("es_principal").default(false),
	codigoProveedor: varchar("codigo_proveedor", { length: 50 }),
}, (table) => [
	foreignKey({
			columns: [table.ingredienteId],
			foreignColumns: [ingredientes.id],
			name: "proveedores_ingredientes_ingrediente_id_fkey"
		}),
	foreignKey({
			columns: [table.proveedorId],
			foreignColumns: [proveedores.id],
			name: "proveedores_ingredientes_proveedor_id_fkey"
		}),
	foreignKey({
			columns: [table.unidadId],
			foreignColumns: [unidadesMedida.id],
			name: "proveedores_ingredientes_unidad_id_fkey"
		}),
	primaryKey({ columns: [table.proveedorId, table.ingredienteId], name: "proveedores_ingredientes_pkey"}),
]);
export const vOrdenesDetalle = pgView("v_ordenes_detalle", {	id: uuid(),
	folio: varchar({ length: 30 }),
	tipo: varchar({ length: 30 }),
	estatus: varchar({ length: 30 }),
	creadoEn: timestamp("creado_en", { withTimezone: true, mode: 'string' }),
	mesa: varchar({ length: 10 }),
	area: varchar({ length: 100 }),
	atendidoPor: text("atendido_por"),
	numComensales: smallint("num_comensales"),
	subtotal: numeric({ precision: 12, scale:  2 }),
	descuentos: numeric({ precision: 12, scale:  2 }),
	impuestos: numeric({ precision: 12, scale:  2 }),
	propina: numeric({ precision: 12, scale:  2 }),
	total: numeric({ precision: 12, scale:  2 }),
}).as(sql`SELECT o.id, o.folio, o.tipo, o.estatus, o.creado_en, m.numero AS mesa, a.nombre AS area, (u.name::text || ' '::text) || u.lastname::text AS atendido_por, o.num_comensales, o.subtotal, o.descuentos, o.impuestos, o.propina, o.total FROM ordenes o LEFT JOIN mesas m ON m.id = o.mesa_id LEFT JOIN areas_salon a ON a.id = m.area_id LEFT JOIN users u ON u.id = o.atendido_por`);

export const vStockIngredientes = pgView("v_stock_ingredientes", {	id: integer(),
	nombre: varchar({ length: 150 }),
	stockActual: numeric("stock_actual", { precision: 10, scale:  3 }),
	stockMinimo: numeric("stock_minimo", { precision: 10, scale:  3 }),
	unidad: varchar({ length: 10 }),
	alerta: text(),
}).as(sql`SELECT i.id, i.nombre, i.stock_actual, i.stock_minimo, um.abreviatura AS unidad, CASE WHEN i.stock_actual <= 0::numeric THEN 'agotado'::text WHEN i.stock_actual <= i.stock_minimo THEN 'bajo'::text ELSE 'ok'::text END AS alerta FROM ingredientes i JOIN unidades_medida um ON um.id = i.unidad_uso_id WHERE i.activo = true`);

export const vVentasPlatillo = pgView("v_ventas_platillo", {	id: integer(),
	nombre: varchar({ length: 150 }),
	precio: numeric({ precision: 10, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vecesOrdenado: bigint("veces_ordenado", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unidadesVendidas: bigint("unidades_vendidas", { mode: "number" }),
	ingresosTotales: numeric("ingresos_totales"),
}).as(sql`SELECT p.id, p.nombre, p.precio, count(oi.id) AS veces_ordenado, sum(oi.cantidad) AS unidades_vendidas, sum(oi.subtotal) AS ingresos_totales FROM platillos p JOIN orden_items oi ON oi.platillo_id = p.id JOIN ordenes o ON o.id = oi.orden_id AND o.estatus::text = 'pagada'::text GROUP BY p.id, p.nombre, p.precio`);

export const vVentasPorDia = pgView("v_ventas_por_dia", {	fecha: date(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalOrdenes: bigint("total_ordenes", { mode: "number" }),
	totalVentas: numeric("total_ventas"),
	ticketPromedio: numeric("ticket_promedio"),
	totalPropinas: numeric("total_propinas"),
}).as(sql`SELECT date(creado_en) AS fecha, count(DISTINCT id) AS total_ordenes, sum(total) AS total_ventas, avg(total) AS ticket_promedio, sum(propina) AS total_propinas FROM ordenes o WHERE estatus::text = 'pagada'::text GROUP BY (date(creado_en)) ORDER BY (date(creado_en)) DESC`);

export const vUsuariosPerfil = pgView("v_usuarios_perfil", {	id: integer(),
	name: varchar({ length: 50 }),
	lastname: varchar({ length: 50 }),
	email: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	isActive: boolean("is_active"),
	rol: varchar({ length: 50 }),
	permissions: jsonb(),
	empleadoId: uuid("empleado_id"),
	numeroEmpleado: varchar("numero_empleado", { length: 20 }),
	puesto: varchar({ length: 100 }),
	departamento: varchar({ length: 100 }),
}).as(sql`SELECT u.id, u.name, u.lastname, u.email, u.phone, u.is_active, r.name AS rol, r.permissions, e.id AS empleado_id, e.numero_empleado, p.nombre AS puesto, d.nombre AS departamento FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN empleados e ON e.user_id = u.id LEFT JOIN puestos p ON p.id = e.puesto_id LEFT JOIN departamentos d ON d.id = p.departamento_id`);
