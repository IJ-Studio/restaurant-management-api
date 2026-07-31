CREATE TABLE "direcciones_cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"alias" varchar(60) DEFAULT 'Casa',
	"linea1" varchar(200) NOT NULL,
	"linea2" varchar(200),
	"colonia" varchar(100),
	"referencias" text,
	"es_principal" boolean DEFAULT false,
	"codigo_postal" varchar(5),
	"ciudad" varchar(100),
	"estado" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "metodos_pago_guardados" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"pasarela" varchar(30) NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_payment_method_id" varchar(255) NOT NULL,
	"marca" varchar(20),
	"ultimos_4" varchar(4),
	"mes_expiracion" smallint,
	"anio_expiracion" smallint,
	"es_principal" boolean DEFAULT false,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perfiles_facturacion" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"rfc" varchar(13) NOT NULL,
	"razon_social" varchar(200) NOT NULL,
	"uso_cfdi" varchar(10) NOT NULL,
	"regimen_fiscal" varchar(50) NOT NULL,
	"codigo_postal_fiscal" varchar(5) NOT NULL,
	"email" varchar(150),
	"es_principal" boolean DEFAULT false,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ordenes" ADD COLUMN "direccion_envio_id" integer;--> statement-breakpoint
ALTER TABLE "ordenes" ADD COLUMN "cancelacion_sintetica" boolean;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "pasarela" varchar(30);--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "id_transaccion_pasarela" varchar(255);--> statement-breakpoint
ALTER TABLE "facturas" ADD COLUMN "facturapi_invoice_id" varchar(100);--> statement-breakpoint
ALTER TABLE "reservaciones" ADD COLUMN "es_sintetica" boolean;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "direcciones_cliente" ADD CONSTRAINT "direcciones_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metodos_pago_guardados" ADD CONSTRAINT "metodos_pago_guardados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfiles_facturacion" ADD CONSTRAINT "perfiles_facturacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_direccion_envio_id_fkey" FOREIGN KEY ("direccion_envio_id") REFERENCES "public"."direcciones_cliente"("id") ON DELETE set null ON UPDATE no action;