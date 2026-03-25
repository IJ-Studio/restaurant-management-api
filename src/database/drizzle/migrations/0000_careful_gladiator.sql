-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"lastname" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"login_lock_until" bigint DEFAULT 0 NOT NULL,
	"recovery_attempts" integer DEFAULT 0 NOT NULL,
	"recovery_lock_until" bigint DEFAULT 0 NOT NULL,
	"session_time" bigint DEFAULT 0 NOT NULL,
	"role_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" serial PRIMARY KEY NOT NULL,
	"platillo_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurante" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) DEFAULT 'El Quijote' NOT NULL,
	"nombre_legal" varchar(200),
	"rfc" varchar(20),
	"logo_url" text,
	"slogan" varchar(255),
	"descripcion" text,
	"direccion" varchar(200) DEFAULT 'Calle Morelos #32, Esq. Hidalgo' NOT NULL,
	"colonia" varchar(100) DEFAULT 'Zona Centro',
	"ciudad" varchar(100) DEFAULT 'Huejutla de Reyes',
	"estado" varchar(100) DEFAULT 'Hidalgo',
	"codigo_postal" varchar(10) DEFAULT '43000',
	"latitud" numeric(10, 7) DEFAULT '21.1378',
	"longitud" numeric(10, 7) DEFAULT '-98.4186',
	"telefono" varchar(20) DEFAULT '+52 771 702 8172',
	"whatsapp" varchar(20),
	"email" varchar(150),
	"facebook_url" text DEFAULT 'https://www.facebook.com/ElQuijote.Huejutla',
	"instagram_url" text,
	"moneda" char(3) DEFAULT 'MXN',
	"zona_horaria" varchar(60) DEFAULT 'America/Mexico_City',
	"impuesto_pct" numeric(5, 2) DEFAULT '16.00',
	"propina_sugerida_pct" numeric(5, 2) DEFAULT '10.00',
	"formato_folio" varchar(30) DEFAULT 'QJT-NNNNNN',
	"mensaje_ticket" text DEFAULT '¡Gracias por su visita a El Quijote!',
	"pie_ticket" text DEFAULT 'Calle Morelos #32 Esq. Hidalgo, Huejutla de Reyes, Hgo.',
	"tiempo_espera_min" integer DEFAULT 15,
	"acepta_reservas" boolean DEFAULT true,
	"acepta_takeout" boolean DEFAULT true,
	"permite_propina_tarjeta" boolean DEFAULT true,
	"politica_cancelacion" text,
	"anio_fundacion" integer,
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "horarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"dia_semana" smallint NOT NULL,
	"apertura" time,
	"cierre" time,
	"hora_cocina_cierre" time,
	"cerrado" boolean DEFAULT false,
	"notas" varchar(150),
	CONSTRAINT "horarios_dia_semana_key" UNIQUE("dia_semana"),
	CONSTRAINT "horarios_dia_semana_check" CHECK ((dia_semana >= 0) AND (dia_semana <= 6))
);
--> statement-breakpoint
CREATE TABLE "horarios_especiales" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"apertura" time,
	"cierre" time,
	"cerrado" boolean DEFAULT false,
	"motivo" varchar(150),
	CONSTRAINT "horarios_especiales_fecha_key" UNIQUE("fecha")
);
--> statement-breakpoint
CREATE TABLE "certificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"organismo" varchar(150),
	"numero" varchar(80),
	"fecha_emision" date,
	"fecha_vencimiento" date,
	"documento_url" text,
	"activa" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "platillos" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"subcategoria_id" integer,
	"codigo" varchar(30),
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"descripcion_corta" varchar(255),
	"imagen_url" text,
	"precio" numeric(10, 2) NOT NULL,
	"precio_costo" numeric(10, 2),
	"tiempo_preparacion" integer,
	"es_vegetariano" boolean DEFAULT false,
	"es_vegano" boolean DEFAULT false,
	"es_sin_gluten" boolean DEFAULT false,
	"es_picante" boolean DEFAULT false,
	"nivel_picante" smallint,
	"es_popular" boolean DEFAULT false,
	"es_nuevo" boolean DEFAULT false,
	"es_del_chef" boolean DEFAULT false,
	"disponible" boolean DEFAULT true,
	"disponible_takeout" boolean DEFAULT true,
	"orden" smallint DEFAULT 0,
	"notas_cocina" text,
	"fecha_alta" date DEFAULT CURRENT_DATE,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "platillos_codigo_key" UNIQUE("codigo"),
	CONSTRAINT "platillos_nivel_picante_check" CHECK ((nivel_picante >= 0) AND (nivel_picante <= 5))
);
--> statement-breakpoint
CREATE TABLE "alergenos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"icono" varchar(10),
	"color" char(7),
	CONSTRAINT "alergenos_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "informacion_nutricional" (
	"id" serial PRIMARY KEY NOT NULL,
	"platillo_id" integer NOT NULL,
	"porcion_gramos" numeric(7, 2),
	"calorias" numeric(7, 2),
	"proteinas_g" numeric(7, 2),
	"carbohidratos_g" numeric(7, 2),
	"azucares_g" numeric(7, 2),
	"fibra_g" numeric(7, 2),
	"grasas_totales_g" numeric(7, 2),
	"grasas_saturadas_g" numeric(7, 2),
	"sodio_mg" numeric(7, 2),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "informacion_nutricional_platillo_id_key" UNIQUE("platillo_id")
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"drive_file_id" varchar(255),
	"drive_url" text,
	"type" varchar(10) DEFAULT 'manual' NOT NULL,
	"status" varchar(10) DEFAULT 'ok' NOT NULL,
	"error_message" text,
	"tables" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomina" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"periodo_inicio" date NOT NULL,
	"periodo_fin" date NOT NULL,
	"dias_trabajados" numeric(5, 2),
	"horas_extra" numeric(6, 2) DEFAULT '0',
	"salario_base" numeric(10, 2) NOT NULL,
	"bonos" numeric(10, 2) DEFAULT '0',
	"propinas" numeric(10, 2) DEFAULT '0',
	"descuento_imss" numeric(10, 2) DEFAULT '0',
	"descuento_isr" numeric(10, 2) DEFAULT '0',
	"otros_descuentos" numeric(10, 2) DEFAULT '0',
	"total_percepciones" numeric(10, 2),
	"total_deducciones" numeric(10, 2),
	"neto_pagar" numeric(10, 2),
	"pagado" boolean DEFAULT false,
	"fecha_pago" date,
	"metodo_pago" varchar(50),
	"comprobante_url" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variantes_platillo" (
	"id" serial PRIMARY KEY NOT NULL,
	"platillo_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"precio_extra" numeric(10, 2) DEFAULT '0',
	"precio_total" numeric(10, 2),
	"disponible" boolean DEFAULT true,
	"orden" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "modificadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"grupo_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"precio_extra" numeric(10, 2) DEFAULT '0',
	"disponible" boolean DEFAULT true,
	"orden" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "puestos" (
	"id" serial PRIMARY KEY NOT NULL,
	"departamento_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"nivel" smallint DEFAULT 1,
	"salario_base" numeric(10, 2),
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "departamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true,
	CONSTRAINT "departamentos_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "empleados" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" integer,
	"puesto_id" integer,
	"numero_empleado" varchar(20),
	"foto_url" text,
	"fecha_nacimiento" date,
	"genero" varchar(20),
	"estado_civil" varchar(20),
	"curp" varchar(18),
	"nss" varchar(15),
	"rfc_empleado" varchar(13),
	"telefono_emergencia" varchar(20),
	"contacto_emergencia" varchar(150),
	"direccion_empleado" text,
	"fecha_ingreso" date,
	"fecha_baja" date,
	"tipo_contrato" varchar(50),
	"jornada" varchar(30),
	"salario_mensual" numeric(10, 2),
	"banco" varchar(80),
	"clabe_interbancaria" varchar(18),
	"activo" boolean DEFAULT true,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "empleados_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "empleados_numero_empleado_key" UNIQUE("numero_empleado"),
	CONSTRAINT "empleados_curp_key" UNIQUE("curp"),
	CONSTRAINT "empleados_nss_key" UNIQUE("nss"),
	CONSTRAINT "empleados_rfc_empleado_key" UNIQUE("rfc_empleado")
);
--> statement-breakpoint
CREATE TABLE "horarios_empleado" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"turno_id" integer NOT NULL,
	"dia_semana" smallint NOT NULL,
	CONSTRAINT "horarios_empleado_empleado_id_dia_semana_key" UNIQUE("empleado_id","dia_semana"),
	CONSTRAINT "horarios_empleado_dia_semana_check" CHECK ((dia_semana >= 0) AND (dia_semana <= 6))
);
--> statement-breakpoint
CREATE TABLE "asistencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"hora_entrada" timestamp with time zone,
	"hora_salida" timestamp with time zone,
	"tipo" varchar(30) DEFAULT 'normal',
	"justificacion" text,
	"aprobado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vacaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"dias_habiles" integer,
	"estatus" varchar(20) DEFAULT 'pendiente',
	"aprobado_por" uuid,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "turnos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time NOT NULL,
	"color" char(7),
	"activo" boolean DEFAULT true,
	CONSTRAINT "turnos_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "evaluaciones_desempeno" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"evaluador_id" uuid NOT NULL,
	"periodo" varchar(20),
	"puntualidad" smallint,
	"actitud" smallint,
	"productividad" smallint,
	"trabajo_equipo" smallint,
	"conocimiento" smallint,
	"puntaje_total" numeric(4, 2),
	"comentarios" text,
	"plan_mejora" text,
	"fecha" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "evaluaciones_desempeno_actitud_check" CHECK ((actitud >= 1) AND (actitud <= 5)),
	CONSTRAINT "evaluaciones_desempeno_conocimiento_check" CHECK ((conocimiento >= 1) AND (conocimiento <= 5)),
	CONSTRAINT "evaluaciones_desempeno_productividad_check" CHECK ((productividad >= 1) AND (productividad <= 5)),
	CONSTRAINT "evaluaciones_desempeno_puntualidad_check" CHECK ((puntualidad >= 1) AND (puntualidad <= 5)),
	CONSTRAINT "evaluaciones_desempeno_trabajo_equipo_check" CHECK ((trabajo_equipo >= 1) AND (trabajo_equipo <= 5))
);
--> statement-breakpoint
CREATE TABLE "capacitaciones_empleado" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"capacitacion_id" integer NOT NULL,
	"fecha_completado" date,
	"calificacion" numeric(5, 2),
	"certificado_url" text,
	CONSTRAINT "capacitaciones_empleado_empleado_id_capacitacion_id_key" UNIQUE("empleado_id","capacitacion_id")
);
--> statement-breakpoint
CREATE TABLE "capacitaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"duracion_hrs" numeric(5, 1),
	"instructor" varchar(150),
	"fecha" date,
	"obligatoria" boolean DEFAULT false,
	"activa" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "categorias_menu" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"imagen_url" text,
	"orden" smallint DEFAULT 0,
	"activa" boolean DEFAULT true,
	"disponible_desde" time,
	"disponible_hasta" time,
	"icono" varchar(50),
	"color" char(7),
	CONSTRAINT "categorias_menu_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "subcategorias_menu" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"orden" smallint DEFAULT 0,
	"activa" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "grupos_modificadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(20) DEFAULT 'single',
	"minimo" smallint DEFAULT 0,
	"maximo" smallint DEFAULT 1,
	"obligatorio" boolean DEFAULT false,
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "ingredientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"unidad_compra_id" integer NOT NULL,
	"unidad_uso_id" integer NOT NULL,
	"factor_conversion" numeric(10, 4) DEFAULT '1',
	"precio_unitario" numeric(10, 4),
	"stock_minimo" numeric(10, 3) DEFAULT '0',
	"stock_maximo" numeric(10, 3),
	"stock_actual" numeric(10, 3) DEFAULT '0',
	"punto_reorden" numeric(10, 3),
	"es_alergeno" boolean DEFAULT false,
	"alergeno_id" integer,
	"perecedero" boolean DEFAULT false,
	"dias_caducidad" integer,
	"codigo_barras" varchar(50),
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recetas" (
	"id" serial PRIMARY KEY NOT NULL,
	"platillo_id" integer NOT NULL,
	"variante_id" integer,
	"version" smallint DEFAULT 1,
	"activa" boolean DEFAULT true,
	"costo_calculado" numeric(10, 4),
	"margen_pct" numeric(5, 2),
	"procedimiento" text,
	"foto_emplatado" text,
	"tiempo_prep_min" integer,
	"porcion_gramos" numeric(7, 2),
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recetas_ingredientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"receta_id" integer NOT NULL,
	"ingrediente_id" integer NOT NULL,
	"cantidad" numeric(10, 4) NOT NULL,
	"unidad_id" integer NOT NULL,
	"es_opcional" boolean DEFAULT false,
	"notas" varchar(255),
	CONSTRAINT "recetas_ingredientes_receta_id_ingrediente_id_key" UNIQUE("receta_id","ingrediente_id")
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"nombre_contacto" varchar(150),
	"rfc" varchar(20),
	"email" varchar(150),
	"telefono" varchar(20),
	"whatsapp" varchar(20),
	"sitio_web" varchar(255),
	"direccion" text,
	"ciudad" varchar(100),
	"dias_credito" integer DEFAULT 0,
	"calificacion" numeric(3, 1),
	"activo" boolean DEFAULT true,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "proveedores_calificacion_check" CHECK ((calificacion >= (0)::numeric) AND (calificacion <= (5)::numeric))
);
--> statement-breakpoint
CREATE TABLE "unidades_medida" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"abreviatura" varchar(10) NOT NULL,
	"tipo" varchar(20),
	CONSTRAINT "unidades_medida_nombre_key" UNIQUE("nombre"),
	CONSTRAINT "unidades_medida_abreviatura_key" UNIQUE("abreviatura")
);
--> statement-breakpoint
CREATE TABLE "categorias_ingrediente" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"icono" varchar(50),
	CONSTRAINT "categorias_ingrediente_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "ordenes_compra" (
	"id" serial PRIMARY KEY NOT NULL,
	"proveedor_id" integer NOT NULL,
	"folio" varchar(30),
	"fecha_orden" date DEFAULT CURRENT_DATE NOT NULL,
	"fecha_esperada" date,
	"fecha_recibida" date,
	"estatus" varchar(30) DEFAULT 'borrador',
	"subtotal" numeric(12, 2),
	"iva" numeric(12, 2),
	"total" numeric(12, 2),
	"notas" text,
	"creado_por" integer,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ordenes_compra_folio_key" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "ordenes_compra_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_compra_id" integer NOT NULL,
	"ingrediente_id" integer NOT NULL,
	"cantidad_pedida" numeric(10, 3) NOT NULL,
	"cantidad_recibida" numeric(10, 3) DEFAULT '0',
	"unidad_id" integer NOT NULL,
	"precio_unitario" numeric(10, 4) NOT NULL,
	"subtotal" numeric(12, 4),
	"notas" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "movimientos_inventario" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingrediente_id" integer NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"cantidad" numeric(10, 3) NOT NULL,
	"unidad_id" integer NOT NULL,
	"stock_anterior" numeric(10, 3),
	"stock_nuevo" numeric(10, 3),
	"costo_unitario" numeric(10, 4),
	"costo_total" numeric(12, 4),
	"referencia_id" integer,
	"referencia_tipo" varchar(30),
	"user_id" integer,
	"fecha" timestamp with time zone DEFAULT now(),
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "conteos_inventario" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"estatus" varchar(20) DEFAULT 'en_proceso',
	"user_id" integer,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "conteos_inventario_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"conteo_id" integer NOT NULL,
	"ingrediente_id" integer NOT NULL,
	"stock_sistema" numeric(10, 3),
	"stock_fisico" numeric(10, 3),
	"diferencia" numeric(10, 3),
	"costo_diferencia" numeric(12, 4)
);
--> statement-breakpoint
CREATE TABLE "areas_salon" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"capacidad" integer,
	"piso" smallint DEFAULT 1,
	"activa" boolean DEFAULT true,
	"imagen_url" text,
	CONSTRAINT "areas_salon_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "mesas" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_id" integer,
	"numero" varchar(10) NOT NULL,
	"nombre" varchar(50),
	"capacidad" smallint NOT NULL,
	"forma" varchar(20) DEFAULT 'cuadrada',
	"posicion_x" integer,
	"posicion_y" integer,
	"qr_code_url" text,
	"activa" boolean DEFAULT true,
	CONSTRAINT "mesas_numero_key" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "programa_lealtad" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) DEFAULT 'Club El Quijote' NOT NULL,
	"descripcion" text,
	"puntos_por_peso" numeric(6, 4) DEFAULT '0.10',
	"valor_punto" numeric(8, 4) DEFAULT '0.10',
	"minimo_canje" integer DEFAULT 50,
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "niveles_lealtad" (
	"id" serial PRIMARY KEY NOT NULL,
	"programa_id" integer NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"puntos_minimos" integer NOT NULL,
	"descuento_pct" numeric(5, 2) DEFAULT '0',
	"multiplicador" numeric(4, 2) DEFAULT '1',
	"beneficios" text,
	"color" char(7),
	"icono" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "direcciones_cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"alias" varchar(60) DEFAULT 'Casa',
	"linea1" varchar(200) NOT NULL,
	"linea2" varchar(200),
	"colonia" varchar(100),
	"referencias" text,
	"es_principal" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "metodos_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"tipo" varchar(30),
	"activo" boolean DEFAULT true,
	"aplica_propina" boolean DEFAULT true,
	"comision_pct" numeric(5, 3) DEFAULT '0',
	CONSTRAINT "metodos_pago_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "categorias_gasto" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(20) DEFAULT 'variable',
	CONSTRAINT "categorias_gasto_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "presupuestos" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"anio" smallint NOT NULL,
	"mes" smallint NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	CONSTRAINT "presupuestos_categoria_id_anio_mes_key" UNIQUE("categoria_id","anio","mes"),
	CONSTRAINT "presupuestos_mes_check" CHECK ((mes >= 1) AND (mes <= 12))
);
--> statement-breakpoint
CREATE TABLE "cortes_diarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"total_ordenes" integer DEFAULT 0,
	"ticket_promedio" numeric(10, 2),
	"total_ventas" numeric(12, 2) DEFAULT '0',
	"total_efectivo" numeric(12, 2) DEFAULT '0',
	"total_tarjeta" numeric(12, 2) DEFAULT '0',
	"total_digital" numeric(12, 2) DEFAULT '0',
	"total_descuentos" numeric(12, 2) DEFAULT '0',
	"total_impuestos" numeric(12, 2) DEFAULT '0',
	"total_propinas" numeric(12, 2) DEFAULT '0',
	"costo_alimentos" numeric(12, 2) DEFAULT '0',
	"costo_mano_obra" numeric(12, 2) DEFAULT '0',
	"otros_gastos" numeric(12, 2) DEFAULT '0',
	"utilidad_bruta" numeric(12, 2),
	"generado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cortes_diarios_fecha_key" UNIQUE("fecha")
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"iva" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2),
	"fecha" date DEFAULT CURRENT_DATE NOT NULL,
	"proveedor_id" integer,
	"metodo_pago_id" integer,
	"folio_factura" varchar(80),
	"comprobante_url" text,
	"recurrente" boolean DEFAULT false,
	"registrado_por" integer,
	"aprobado_por" integer,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campanas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"canal" varchar(50),
	"objetivo" varchar(80),
	"presupuesto" numeric(12, 2),
	"fecha_inicio" date,
	"fecha_fin" date,
	"estatus" varchar(20) DEFAULT 'borrador',
	"enviados" integer DEFAULT 0,
	"conversiones" integer DEFAULT 0,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resenas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"orden_id" uuid,
	"nombre_cliente" varchar(150),
	"plataforma" varchar(50) DEFAULT 'interna',
	"calificacion_general" smallint,
	"calificacion_comida" smallint,
	"calificacion_servicio" smallint,
	"calificacion_ambiente" smallint,
	"calificacion_precio" smallint,
	"comentario" text,
	"respuesta" text,
	"respondido_por" integer,
	"fecha_respuesta" timestamp with time zone,
	"visible" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resenas_calificacion_ambiente_check" CHECK ((calificacion_ambiente >= 1) AND (calificacion_ambiente <= 5)),
	CONSTRAINT "resenas_calificacion_comida_check" CHECK ((calificacion_comida >= 1) AND (calificacion_comida <= 5)),
	CONSTRAINT "resenas_calificacion_general_check" CHECK ((calificacion_general >= 1) AND (calificacion_general <= 5)),
	CONSTRAINT "resenas_calificacion_precio_check" CHECK ((calificacion_precio >= 1) AND (calificacion_precio <= 5)),
	CONSTRAINT "resenas_calificacion_servicio_check" CHECK ((calificacion_servicio >= 1) AND (calificacion_servicio <= 5))
);
--> statement-breakpoint
CREATE TABLE "respuestas_encuesta" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuesta_id" integer NOT NULL,
	"user_id" integer,
	"orden_id" uuid,
	"respuestas" jsonb,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "encuestas_satisfaccion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"activa" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "preguntas_encuesta" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuesta_id" integer NOT NULL,
	"pregunta" text NOT NULL,
	"tipo" varchar(30) DEFAULT 'escala',
	"opciones" jsonb,
	"obligatoria" boolean DEFAULT true,
	"orden" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "logs_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tabla" varchar(80),
	"registro_id" varchar(80),
	"accion" varchar(20) NOT NULL,
	"datos_antes" jsonb,
	"datos_despues" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tipo" varchar(50),
	"titulo" varchar(150),
	"mensaje" text,
	"leida" boolean DEFAULT false,
	"url_accion" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "combos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"precio" numeric(10, 2) NOT NULL,
	"precio_regular" numeric(10, 2),
	"imagen_url" text,
	"disponible" boolean DEFAULT true,
	"fecha_inicio" date,
	"fecha_fin" date,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "combos_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"combo_id" integer NOT NULL,
	"platillo_id" integer NOT NULL,
	"cantidad" smallint DEFAULT 1,
	"obligatorio" boolean DEFAULT true,
	"orden" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "menus_del_dia" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"fecha" date NOT NULL,
	"precio" numeric(10, 2) NOT NULL,
	"incluye_bebida" boolean DEFAULT false,
	"incluye_postre" boolean DEFAULT false,
	"disponible" boolean DEFAULT true,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menus_del_dia_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_dia_id" integer NOT NULL,
	"platillo_id" integer NOT NULL,
	"tipo" varchar(30),
	"orden" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "preferencias_cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"alergenos" integer[] DEFAULT '{}',
	"dieta" varchar(50),
	"mesa_preferida" integer,
	"bebida_favorita" varchar(150),
	"platillo_favorito" integer,
	"notas" text,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "preferencias_cliente_cliente_id_key" UNIQUE("cliente_id")
);
--> statement-breakpoint
CREATE TABLE "cupones" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"tipo" varchar(30) NOT NULL,
	"valor" numeric(10, 2),
	"minimo_compra" numeric(10, 2) DEFAULT '0',
	"maximo_descuento" numeric(10, 2),
	"usos_maximos" integer,
	"usos_por_cliente" smallint DEFAULT 1,
	"usos_actuales" integer DEFAULT 0,
	"fecha_inicio" date,
	"fecha_fin" date,
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cupones_codigo_key" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "comandas" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" uuid NOT NULL,
	"estacion_id" integer NOT NULL,
	"folio_comanda" varchar(20),
	"estatus" varchar(30) DEFAULT 'pendiente',
	"prioridad" smallint DEFAULT 0,
	"tiempo_inicio" timestamp with time zone,
	"tiempo_listo" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "estaciones_cocina" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" text,
	"impresora" varchar(80),
	"color" char(7),
	"activa" boolean DEFAULT true,
	CONSTRAINT "estaciones_cocina_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "ordenes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"folio" varchar(30),
	"tipo" varchar(30) DEFAULT 'mesa' NOT NULL,
	"mesa_id" integer,
	"cliente_id" uuid,
	"reservacion_id" uuid,
	"atendido_por" integer,
	"num_comensales" smallint DEFAULT 1,
	"estatus" varchar(30) DEFAULT 'abierta',
	"subtotal" numeric(12, 2) DEFAULT '0',
	"descuentos" numeric(12, 2) DEFAULT '0',
	"impuestos" numeric(12, 2) DEFAULT '0',
	"propina" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"notas_cliente" text,
	"notas_cocina" text,
	"prioridad" smallint DEFAULT 0,
	"tiempo_apertura" timestamp with time zone DEFAULT now(),
	"tiempo_cierre" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ordenes_folio_key" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "orden_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" uuid NOT NULL,
	"platillo_id" integer NOT NULL,
	"variante_id" integer,
	"combo_id" integer,
	"cantidad" smallint DEFAULT 1 NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2),
	"estatus" varchar(30) DEFAULT 'pendiente',
	"estacion_id" integer,
	"notas" text,
	"enviado_cocina" boolean DEFAULT false,
	"tiempo_envio" timestamp with time zone,
	"tiempo_listo" timestamp with time zone,
	"tiempo_entrega" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orden_item_modificadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_item_id" integer NOT NULL,
	"modificador_id" integer NOT NULL,
	"precio_extra" numeric(10, 2) DEFAULT '0',
	"cantidad" smallint DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "historial_estatus_orden" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" uuid NOT NULL,
	"estatus" varchar(30) NOT NULL,
	"user_id" integer,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" uuid NOT NULL,
	"metodo_pago_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"cambio" numeric(12, 2) DEFAULT '0',
	"referencia" varchar(100),
	"propina" numeric(12, 2) DEFAULT '0',
	"cobrado_por" integer,
	"estatus" varchar(20) DEFAULT 'completado',
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "estatus_mesa" (
	"id" serial PRIMARY KEY NOT NULL,
	"mesa_id" integer NOT NULL,
	"estatus" varchar(30) DEFAULT 'disponible',
	"orden_id" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "estatus_mesa_mesa_id_key" UNIQUE("mesa_id")
);
--> statement-breakpoint
CREATE TABLE "reservaciones" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"mesa_id" integer,
	"user_id" integer,
	"cliente_nombre" varchar(150) NOT NULL,
	"cliente_telefono" varchar(20),
	"cliente_email" varchar(150),
	"fecha_hora" timestamp with time zone NOT NULL,
	"duracion_min" integer DEFAULT 90,
	"num_comensales" smallint NOT NULL,
	"ocasion" varchar(80),
	"peticiones_especiales" text,
	"estatus" varchar(30) DEFAULT 'confirmada',
	"canal" varchar(30) DEFAULT 'telefono',
	"recordatorio_enviado" boolean DEFAULT false,
	"no_show" boolean DEFAULT false,
	"deposito_requerido" numeric(10, 2) DEFAULT '0',
	"deposito_pagado" numeric(10, 2) DEFAULT '0',
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cierres_caja" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"fecha_apertura" timestamp with time zone NOT NULL,
	"fecha_cierre" timestamp with time zone,
	"fondo_inicial" numeric(12, 2) DEFAULT '0',
	"efectivo_ventas" numeric(12, 2) DEFAULT '0',
	"tarjeta_ventas" numeric(12, 2) DEFAULT '0',
	"digital_ventas" numeric(12, 2) DEFAULT '0',
	"total_ventas" numeric(12, 2) DEFAULT '0',
	"efectivo_contado" numeric(12, 2),
	"diferencia" numeric(12, 2),
	"propinas" numeric(12, 2) DEFAULT '0',
	"notas" text,
	"estatus" varchar(20) DEFAULT 'abierto'
);
--> statement-breakpoint
CREATE TABLE "facturas" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"orden_id" uuid NOT NULL,
	"user_id" integer,
	"folio_fiscal" varchar(50),
	"serie" varchar(5),
	"folio" varchar(20),
	"rfc_emisor" varchar(13),
	"rfc_receptor" varchar(13) NOT NULL,
	"razon_social" varchar(200) NOT NULL,
	"uso_cfdi" varchar(10),
	"regimen_fiscal" varchar(50),
	"subtotal" numeric(12, 2),
	"iva" numeric(12, 2),
	"total" numeric(12, 2),
	"xml_url" text,
	"pdf_url" text,
	"estatus" varchar(20) DEFAULT 'vigente',
	"fecha_emision" timestamp with time zone DEFAULT now(),
	"fecha_cancelacion" timestamp with time zone,
	CONSTRAINT "facturas_folio_fiscal_key" UNIQUE("folio_fiscal")
);
--> statement-breakpoint
CREATE TABLE "reembolsos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pago_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"motivo" text,
	"aprobado_por" integer,
	"metodo_devolucion" varchar(50),
	"referencia" varchar(100),
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cupones_usos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cupon_id" integer NOT NULL,
	"orden_id" uuid NOT NULL,
	"user_id" integer,
	"descuento" numeric(10, 2),
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" integer,
	"rfc" varchar(13),
	"razon_social" varchar(200),
	"requiere_factura" boolean DEFAULT false,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "clientes_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cuentas_lealtad" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nivel_id" integer,
	"puntos_acumulados" integer DEFAULT 0,
	"puntos_canjeados" integer DEFAULT 0,
	"puntos_disponibles" integer DEFAULT 0,
	"total_gastado" numeric(12, 2) DEFAULT '0',
	"visitas" integer DEFAULT 0,
	"ultima_visita" timestamp with time zone,
	"activa" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cuentas_lealtad_cliente_id_key" UNIQUE("cliente_id")
);
--> statement-breakpoint
CREATE TABLE "transacciones_lealtad" (
	"id" serial PRIMARY KEY NOT NULL,
	"cuenta_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"puntos" integer NOT NULL,
	"balance_antes" integer,
	"balance_despues" integer,
	"referencia" varchar(100),
	"descripcion" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platillos_alergenos" (
	"platillo_id" integer NOT NULL,
	"alergeno_id" integer NOT NULL,
	CONSTRAINT "platillos_alergenos_pkey" PRIMARY KEY("platillo_id","alergeno_id")
);
--> statement-breakpoint
CREATE TABLE "platillos_modificadores" (
	"platillo_id" integer NOT NULL,
	"grupo_id" integer NOT NULL,
	CONSTRAINT "platillos_modificadores_pkey" PRIMARY KEY("platillo_id","grupo_id")
);
--> statement-breakpoint
CREATE TABLE "categorias_estacion" (
	"estacion_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	CONSTRAINT "categorias_estacion_pkey" PRIMARY KEY("estacion_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "proveedores_ingredientes" (
	"proveedor_id" integer NOT NULL,
	"ingrediente_id" integer NOT NULL,
	"precio" numeric(10, 4) NOT NULL,
	"unidad_id" integer NOT NULL,
	"tiempo_entrega" integer,
	"es_principal" boolean DEFAULT false,
	"codigo_proveedor" varchar(50),
	CONSTRAINT "proveedores_ingredientes_pkey" PRIMARY KEY("proveedor_id","ingrediente_id")
);
--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos" ADD CONSTRAINT "platillos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos" ADD CONSTRAINT "platillos_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "public"."subcategorias_menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informacion_nutricional" ADD CONSTRAINT "informacion_nutricional_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variantes_platillo" ADD CONSTRAINT "variantes_platillo_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modificadores" ADD CONSTRAINT "modificadores_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_modificadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puestos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios_empleado" ADD CONSTRAINT "horarios_empleado_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios_empleado" ADD CONSTRAINT "horarios_empleado_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacaciones" ADD CONSTRAINT "vacaciones_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacaciones" ADD CONSTRAINT "vacaciones_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones_desempeno" ADD CONSTRAINT "evaluaciones_desempeno_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones_desempeno" ADD CONSTRAINT "evaluaciones_desempeno_evaluador_id_fkey" FOREIGN KEY ("evaluador_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacitaciones_empleado" ADD CONSTRAINT "capacitaciones_empleado_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "public"."capacitaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacitaciones_empleado" ADD CONSTRAINT "capacitaciones_empleado_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategorias_menu" ADD CONSTRAINT "subcategorias_menu_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_alergeno_id_fkey" FOREIGN KEY ("alergeno_id") REFERENCES "public"."alergenos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_ingrediente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_unidad_compra_id_fkey" FOREIGN KEY ("unidad_compra_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_unidad_uso_id_fkey" FOREIGN KEY ("unidad_uso_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."variantes_platillo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas_ingredientes" ADD CONSTRAINT "recetas_ingredientes_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas_ingredientes" ADD CONSTRAINT "recetas_ingredientes_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "public"."recetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas_ingredientes" ADD CONSTRAINT "recetas_ingredientes_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra_items" ADD CONSTRAINT "ordenes_compra_items_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra_items" ADD CONSTRAINT "ordenes_compra_items_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "public"."ordenes_compra"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra_items" ADD CONSTRAINT "ordenes_compra_items_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteos_inventario" ADD CONSTRAINT "conteos_inventario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteos_inventario_items" ADD CONSTRAINT "conteos_inventario_items_conteo_id_fkey" FOREIGN KEY ("conteo_id") REFERENCES "public"."conteos_inventario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteos_inventario_items" ADD CONSTRAINT "conteos_inventario_items_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas_salon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niveles_lealtad" ADD CONSTRAINT "niveles_lealtad_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "public"."programa_lealtad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direcciones_cliente" ADD CONSTRAINT "direcciones_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_gasto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_gasto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_metodo_pago_id_fkey" FOREIGN KEY ("metodo_pago_id") REFERENCES "public"."metodos_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_respondido_por_fkey" FOREIGN KEY ("respondido_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_encuesta" ADD CONSTRAINT "respuestas_encuesta_encuesta_id_fkey" FOREIGN KEY ("encuesta_id") REFERENCES "public"."encuestas_satisfaccion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_encuesta" ADD CONSTRAINT "respuestas_encuesta_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_encuesta" ADD CONSTRAINT "respuestas_encuesta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preguntas_encuesta" ADD CONSTRAINT "preguntas_encuesta_encuesta_id_fkey" FOREIGN KEY ("encuesta_id") REFERENCES "public"."encuestas_satisfaccion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combos_items" ADD CONSTRAINT "combos_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combos_items" ADD CONSTRAINT "combos_items_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus_del_dia_items" ADD CONSTRAINT "menus_del_dia_items_menu_dia_id_fkey" FOREIGN KEY ("menu_dia_id") REFERENCES "public"."menus_del_dia"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus_del_dia_items" ADD CONSTRAINT "menus_del_dia_items_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencias_cliente" ADD CONSTRAINT "preferencias_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencias_cliente" ADD CONSTRAINT "preferencias_cliente_mesa_preferida_fkey" FOREIGN KEY ("mesa_preferida") REFERENCES "public"."mesas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencias_cliente" ADD CONSTRAINT "preferencias_cliente_platillo_favorito_fkey" FOREIGN KEY ("platillo_favorito") REFERENCES "public"."platillos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones_cocina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_atendido_por_fkey" FOREIGN KEY ("atendido_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_reservacion_id_fkey" FOREIGN KEY ("reservacion_id") REFERENCES "public"."reservaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones_cocina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."variantes_platillo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_item_modificadores" ADD CONSTRAINT "orden_item_modificadores_modificador_id_fkey" FOREIGN KEY ("modificador_id") REFERENCES "public"."modificadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orden_item_modificadores" ADD CONSTRAINT "orden_item_modificadores_orden_item_id_fkey" FOREIGN KEY ("orden_item_id") REFERENCES "public"."orden_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estatus_orden" ADD CONSTRAINT "historial_estatus_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estatus_orden" ADD CONSTRAINT "historial_estatus_orden_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cobrado_por_fkey" FOREIGN KEY ("cobrado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_metodo_pago_id_fkey" FOREIGN KEY ("metodo_pago_id") REFERENCES "public"."metodos_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estatus_mesa" ADD CONSTRAINT "estatus_mesa_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estatus_mesa" ADD CONSTRAINT "fk_estatus_mesa_orden" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservaciones" ADD CONSTRAINT "reservaciones_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservaciones" ADD CONSTRAINT "reservaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones_usos" ADD CONSTRAINT "cupones_usos_cupon_id_fkey" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones_usos" ADD CONSTRAINT "cupones_usos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones_usos" ADD CONSTRAINT "cupones_usos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_lealtad" ADD CONSTRAINT "cuentas_lealtad_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_lealtad" ADD CONSTRAINT "cuentas_lealtad_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveles_lealtad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones_lealtad" ADD CONSTRAINT "transacciones_lealtad_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas_lealtad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos_alergenos" ADD CONSTRAINT "platillos_alergenos_alergeno_id_fkey" FOREIGN KEY ("alergeno_id") REFERENCES "public"."alergenos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos_alergenos" ADD CONSTRAINT "platillos_alergenos_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos_modificadores" ADD CONSTRAINT "platillos_modificadores_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_modificadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platillos_modificadores" ADD CONSTRAINT "platillos_modificadores_platillo_id_fkey" FOREIGN KEY ("platillo_id") REFERENCES "public"."platillos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_estacion" ADD CONSTRAINT "categorias_estacion_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_estacion" ADD CONSTRAINT "categorias_estacion_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones_cocina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores_ingredientes" ADD CONSTRAINT "proveedores_ingredientes_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores_ingredientes" ADD CONSTRAINT "proveedores_ingredientes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores_ingredientes" ADD CONSTRAINT "proveedores_ingredientes_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_platillos_categoria" ON "platillos" USING btree ("categoria_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_platillos_disponible" ON "platillos" USING btree ("disponible" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_empleados_user" ON "empleados" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_asistencias_fecha" ON "asistencias" USING btree ("fecha" date_ops);--> statement-breakpoint
CREATE INDEX "idx_movimientos_fecha" ON "movimientos_inventario" USING btree ("fecha" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_logs_fecha" ON "logs_auditoria" USING btree ("creado_en" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_logs_user" ON "logs_auditoria" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_notificaciones_user" ON "notificaciones" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ordenes_atendido_por" ON "ordenes" USING btree ("atendido_por" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ordenes_estatus" ON "ordenes" USING btree ("estatus" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ordenes_fecha" ON "ordenes" USING btree ("creado_en" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ordenes_mesa" ON "ordenes" USING btree ("mesa_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_orden_items_orden" ON "orden_items" USING btree ("orden_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_orden_items_platillo" ON "orden_items" USING btree ("platillo_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pagos_orden" ON "pagos" USING btree ("orden_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reservaciones_fecha" ON "reservaciones" USING btree ("fecha_hora" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_user" ON "clientes" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE VIEW "public"."v_ordenes_detalle" AS (SELECT o.id, o.folio, o.tipo, o.estatus, o.creado_en, m.numero AS mesa, a.nombre AS area, (u.name::text || ' '::text) || u.lastname::text AS atendido_por, o.num_comensales, o.subtotal, o.descuentos, o.impuestos, o.propina, o.total FROM ordenes o LEFT JOIN mesas m ON m.id = o.mesa_id LEFT JOIN areas_salon a ON a.id = m.area_id LEFT JOIN users u ON u.id = o.atendido_por);--> statement-breakpoint
CREATE VIEW "public"."v_stock_ingredientes" AS (SELECT i.id, i.nombre, i.stock_actual, i.stock_minimo, um.abreviatura AS unidad, CASE WHEN i.stock_actual <= 0::numeric THEN 'agotado'::text WHEN i.stock_actual <= i.stock_minimo THEN 'bajo'::text ELSE 'ok'::text END AS alerta FROM ingredientes i JOIN unidades_medida um ON um.id = i.unidad_uso_id WHERE i.activo = true);--> statement-breakpoint
CREATE VIEW "public"."v_ventas_platillo" AS (SELECT p.id, p.nombre, p.precio, count(oi.id) AS veces_ordenado, sum(oi.cantidad) AS unidades_vendidas, sum(oi.subtotal) AS ingresos_totales FROM platillos p JOIN orden_items oi ON oi.platillo_id = p.id JOIN ordenes o ON o.id = oi.orden_id AND o.estatus::text = 'pagada'::text GROUP BY p.id, p.nombre, p.precio);--> statement-breakpoint
CREATE VIEW "public"."v_ventas_por_dia" AS (SELECT date(creado_en) AS fecha, count(DISTINCT id) AS total_ordenes, sum(total) AS total_ventas, avg(total) AS ticket_promedio, sum(propina) AS total_propinas FROM ordenes o WHERE estatus::text = 'pagada'::text GROUP BY (date(creado_en)) ORDER BY (date(creado_en)) DESC);--> statement-breakpoint
CREATE VIEW "public"."v_usuarios_perfil" AS (SELECT u.id, u.name, u.lastname, u.email, u.phone, u.is_active, r.name AS rol, r.permissions, e.id AS empleado_id, e.numero_empleado, p.nombre AS puesto, d.nombre AS departamento FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN empleados e ON e.user_id = u.id LEFT JOIN puestos p ON p.id = e.puesto_id LEFT JOIN departamentos d ON d.id = p.departamento_id);
*/