-- Estructura de la base de pruebas, sin datos (pg_dump --schema-only). Sin `\restrict` ni
-- `transaction_timeout` para que cargue en PostgreSQL 16 o más. Úsala solo con test/db/preparar.sql.
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: fn_nomina_movimientos_correccion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nomina_movimientos_correccion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare original public.nomina_movimientos;
begin
  if new.corrige_id is null then return new; end if;
  select * into original from public.nomina_movimientos where id = new.corrige_id;
  if original.empleado_id <> new.empleado_id or original.monto <> new.monto or original.tipo = new.tipo
     or original.corrige_id is not null then
    raise exception 'Una corrección debe ser el movimiento inverso exacto de un movimiento original.'
      using errcode = '23514';
  end if;
  return new;
end $$;


--
-- Name: fn_nomina_movimientos_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nomina_movimientos_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception 'El historial de nómina no se edita ni se borra: registra un movimiento inverso.'
    using errcode = 'P0001';
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alergenos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alergenos (
    id integer NOT NULL,
    nombre character varying(80) NOT NULL
);


--
-- Name: alergenos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alergenos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alergenos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alergenos_id_seq OWNED BY public.alergenos.id;


--
-- Name: areas_salon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas_salon (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    capacidad integer,
    piso smallint DEFAULT 1,
    activa boolean DEFAULT true,
    imagen_url text
);


--
-- Name: areas_salon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_salon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: areas_salon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_salon_id_seq OWNED BY public.areas_salon.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    drive_file_id character varying(255),
    drive_url text,
    type character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    status character varying(10) DEFAULT 'ok'::character varying NOT NULL,
    error_message text,
    tables jsonb,
    row_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: categorias_estacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_estacion (
    estacion_id integer NOT NULL,
    categoria_id integer NOT NULL
);


--
-- Name: categorias_gasto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_gasto (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo character varying(20) DEFAULT 'variable'::character varying
);


--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_gasto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_gasto_id_seq OWNED BY public.categorias_gasto.id;


--
-- Name: categorias_ingrediente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_ingrediente (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    icono character varying(50)
);


--
-- Name: categorias_ingrediente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_ingrediente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_ingrediente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_ingrediente_id_seq OWNED BY public.categorias_ingrediente.id;


--
-- Name: categorias_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_menu (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    imagen_url text,
    orden smallint DEFAULT 0,
    activa boolean DEFAULT true,
    disponible_desde time without time zone,
    disponible_hasta time without time zone,
    icono character varying(50),
    color character(7),
    tipo character varying(10)
);


--
-- Name: categorias_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_menu_id_seq OWNED BY public.categorias_menu.id;


--
-- Name: cierres_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cierres_caja (
    id integer NOT NULL,
    user_id integer,
    fecha_apertura timestamp with time zone NOT NULL,
    fecha_cierre timestamp with time zone,
    fondo_inicial numeric(12,2) DEFAULT '0'::numeric,
    efectivo_ventas numeric(12,2) DEFAULT '0'::numeric,
    tarjeta_ventas numeric(12,2) DEFAULT '0'::numeric,
    digital_ventas numeric(12,2) DEFAULT '0'::numeric,
    total_ventas numeric(12,2) DEFAULT '0'::numeric,
    efectivo_contado numeric(12,2),
    diferencia numeric(12,2),
    propinas numeric(12,2) DEFAULT '0'::numeric,
    notas text,
    estatus character varying(20) DEFAULT 'abierto'::character varying
);


--
-- Name: cierres_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cierres_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cierres_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cierres_caja_id_seq OWNED BY public.cierres_caja.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id integer,
    rfc character varying(13),
    razon_social character varying(200),
    requiere_factura boolean DEFAULT false,
    stripe_customer_id text,
    fecha_nacimiento date,
    sexo character varying(10),
    ciudad character varying(60),
    colonia character varying(80),
    codigo_postal character varying(5),
    alergias character varying(120),
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: combos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    precio_regular numeric(10,2),
    imagen_url text,
    disponible boolean DEFAULT true,
    fecha_inicio date,
    fecha_fin date,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: combos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combos_id_seq OWNED BY public.combos.id;


--
-- Name: consentimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consentimientos (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    tipo text NOT NULL,
    otorgado boolean NOT NULL,
    version text,
    origen text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consentimientos_origen_check CHECK ((origen = ANY (ARRAY['movil'::text, 'web'::text]))),
    CONSTRAINT consentimientos_tipo_check CHECK ((tipo = ANY (ARRAY['aviso_privacidad'::text, 'notificaciones_push'::text, 'reportes_errores'::text])))
);


--
-- Name: consentimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.consentimientos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.consentimientos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cupones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cupones (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    tipo character varying(30) NOT NULL,
    valor numeric(10,2),
    minimo_compra numeric(10,2) DEFAULT '0'::numeric,
    maximo_descuento numeric(10,2),
    usos_maximos integer,
    usos_por_cliente smallint DEFAULT 1,
    usos_actuales integer DEFAULT 0,
    fecha_inicio date,
    fecha_fin date,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: cupones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cupones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cupones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cupones_id_seq OWNED BY public.cupones.id;


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true
);


--
-- Name: departamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departamentos_id_seq OWNED BY public.departamentos.id;


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    platform character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: device_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_tokens_id_seq OWNED BY public.device_tokens.id;


--
-- Name: direcciones_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direcciones_cliente (
    id integer NOT NULL,
    cliente_id uuid NOT NULL,
    alias character varying(60) DEFAULT 'Casa'::character varying,
    linea1 character varying(200) NOT NULL,
    linea2 character varying(200),
    colonia character varying(100),
    referencias text,
    es_principal boolean DEFAULT false,
    codigo_postal character varying(5),
    ciudad character varying(100),
    estado character varying(100)
);


--
-- Name: direcciones_cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direcciones_cliente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direcciones_cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direcciones_cliente_id_seq OWNED BY public.direcciones_cliente.id;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id integer,
    puesto_id integer,
    numero_empleado character varying(20),
    foto_url text,
    fecha_nacimiento date,
    genero character varying(20),
    estado_civil character varying(20),
    curp character varying(18),
    nss character varying(15),
    rfc_empleado character varying(13),
    telefono_emergencia character varying(20),
    contacto_emergencia character varying(150),
    direccion_empleado text,
    fecha_ingreso date,
    fecha_baja date,
    tipo_contrato character varying(50),
    jornada character varying(30),
    salario_mensual numeric(10,2),
    banco character varying(80),
    clabe_interbancaria character varying(18),
    activo boolean DEFAULT true,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    nombre character varying(120)
);


--
-- Name: estaciones_cocina; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estaciones_cocina (
    id integer NOT NULL,
    nombre character varying(80) NOT NULL,
    descripcion text,
    impresora character varying(80),
    color character(7),
    activa boolean DEFAULT true
);


--
-- Name: estaciones_cocina_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estaciones_cocina_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estaciones_cocina_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estaciones_cocina_id_seq OWNED BY public.estaciones_cocina.id;


--
-- Name: estatus_mesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estatus_mesa (
    id integer NOT NULL,
    mesa_id integer NOT NULL,
    estatus character varying(30) DEFAULT 'disponible'::character varying,
    orden_id uuid,
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: estatus_mesa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estatus_mesa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estatus_mesa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estatus_mesa_id_seq OWNED BY public.estatus_mesa.id;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    orden_id uuid NOT NULL,
    user_id integer,
    folio_fiscal character varying(50),
    serie character varying(5),
    folio character varying(20),
    rfc_emisor character varying(13),
    rfc_receptor character varying(13) NOT NULL,
    razon_social character varying(200) NOT NULL,
    uso_cfdi character varying(10),
    regimen_fiscal character varying(50),
    subtotal numeric(12,2),
    iva numeric(12,2),
    total numeric(12,2),
    xml_url text,
    pdf_url text,
    estatus character varying(20) DEFAULT 'vigente'::character varying,
    fecha_emision timestamp with time zone DEFAULT now(),
    fecha_cancelacion timestamp with time zone,
    facturapi_invoice_id character varying(100)
);


--
-- Name: grupos_modificadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos_modificadores (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo character varying(20) DEFAULT 'single'::character varying,
    minimo smallint DEFAULT 0,
    maximo smallint DEFAULT 1,
    obligatorio boolean DEFAULT false,
    activo boolean DEFAULT true
);


--
-- Name: grupos_modificadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupos_modificadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_modificadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupos_modificadores_id_seq OWNED BY public.grupos_modificadores.id;


--
-- Name: horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios (
    id integer NOT NULL,
    dia_semana smallint NOT NULL,
    apertura time without time zone,
    cierre time without time zone,
    hora_cocina_cierre time without time zone,
    cerrado boolean DEFAULT false,
    notas character varying(150),
    CONSTRAINT horarios_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6)))
);


--
-- Name: horarios_especiales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios_especiales (
    id integer NOT NULL,
    fecha date NOT NULL,
    apertura time without time zone,
    cierre time without time zone,
    cerrado boolean DEFAULT false,
    motivo character varying(150)
);


--
-- Name: horarios_especiales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_especiales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_especiales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_especiales_id_seq OWNED BY public.horarios_especiales.id;


--
-- Name: horarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_id_seq OWNED BY public.horarios.id;


--
-- Name: ingredientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredientes (
    id integer NOT NULL,
    categoria_id integer,
    nombre character varying(150) NOT NULL,
    descripcion text,
    unidad_compra_id integer NOT NULL,
    unidad_uso_id integer NOT NULL,
    factor_conversion numeric(10,4) DEFAULT '1'::numeric,
    precio_unitario numeric(10,4),
    stock_minimo numeric(10,3) DEFAULT '0'::numeric,
    stock_maximo numeric(10,3),
    stock_actual numeric(10,3) DEFAULT '0'::numeric,
    punto_reorden numeric(10,3),
    es_alergeno boolean DEFAULT false,
    alergeno_id integer,
    perecedero boolean DEFAULT false,
    dias_caducidad integer,
    codigo_barras character varying(50),
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ingredientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ingredientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredientes_id_seq OWNED BY public.ingredientes.id;


--
-- Name: inventario_mermas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_mermas (
    id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit character varying(20) NOT NULL,
    reason character varying(50) NOT NULL,
    justification text NOT NULL,
    reported_by text DEFAULT ''::text NOT NULL,
    reportado_por_id integer,
    cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    date timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventario_mermas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_mermas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_mermas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_mermas_id_seq OWNED BY public.inventario_mermas.id;


--
-- Name: inventario_ordenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_ordenes (
    id integer NOT NULL,
    folio character varying(30) NOT NULL,
    supplier_id integer,
    supplier_name text NOT NULL,
    status character varying(30) DEFAULT 'borrador'::character varying NOT NULL,
    items json DEFAULT '[]'::json NOT NULL,
    total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    expected_at text,
    received_at text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventario_ordenes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_ordenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_ordenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_ordenes_id_seq OWNED BY public.inventario_ordenes.id;


--
-- Name: inventario_productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_productos (
    id integer NOT NULL,
    name text NOT NULL,
    sku character varying(50) DEFAULT ''::character varying NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(20) DEFAULT 'pza'::character varying NOT NULL,
    stock numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    min_stock numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    max_stock numeric(10,3) DEFAULT '100'::numeric NOT NULL,
    cost_per_unit numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    supplier text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventario_productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_productos_id_seq OWNED BY public.inventario_productos.id;


--
-- Name: inventario_proveedor_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_proveedor_producto (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    producto_id integer NOT NULL,
    es_principal boolean DEFAULT true,
    notas text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventario_proveedor_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_proveedor_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_proveedor_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_proveedor_producto_id_seq OWNED BY public.inventario_proveedor_producto.id;


--
-- Name: inventario_proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_proveedores (
    id integer NOT NULL,
    name text NOT NULL,
    contact text DEFAULT ''::text,
    email text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    website text,
    address text,
    category text DEFAULT ''::text NOT NULL,
    products json DEFAULT '[]'::json NOT NULL,
    payment_terms text DEFAULT 'Contado'::text NOT NULL,
    delivery_days integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventario_proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_proveedores_id_seq OWNED BY public.inventario_proveedores.id;


--
-- Name: logs_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_auditoria (
    id bigint NOT NULL,
    user_id integer,
    tabla character varying(80),
    registro_id character varying(80),
    accion character varying(20) NOT NULL,
    datos_antes jsonb,
    datos_despues jsonb,
    ip_address inet,
    user_agent text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: logs_auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.logs_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: logs_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.logs_auditoria_id_seq OWNED BY public.logs_auditoria.id;


--
-- Name: menus_del_dia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus_del_dia (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    fecha date NOT NULL,
    precio numeric(10,2) NOT NULL,
    incluye_bebida boolean DEFAULT false,
    incluye_postre boolean DEFAULT false,
    disponible boolean DEFAULT true,
    notas text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: menus_del_dia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menus_del_dia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menus_del_dia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menus_del_dia_id_seq OWNED BY public.menus_del_dia.id;


--
-- Name: menus_del_dia_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus_del_dia_items (
    id integer NOT NULL,
    menu_dia_id integer NOT NULL,
    platillo_id integer NOT NULL,
    tipo character varying(30),
    orden smallint DEFAULT 0
);


--
-- Name: menus_del_dia_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menus_del_dia_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menus_del_dia_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menus_del_dia_items_id_seq OWNED BY public.menus_del_dia_items.id;


--
-- Name: mesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mesas (
    id integer NOT NULL,
    area_id integer,
    numero character varying(10) NOT NULL,
    nombre character varying(50),
    capacidad smallint NOT NULL,
    forma character varying(20) DEFAULT 'cuadrada'::character varying,
    posicion_x integer,
    posicion_y integer,
    qr_code_url text,
    activa boolean DEFAULT true
);


--
-- Name: mesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    nombre character varying(80) NOT NULL,
    tipo character varying(30),
    activo boolean DEFAULT true,
    aplica_propina boolean DEFAULT true,
    comision_pct numeric(5,3) DEFAULT '0'::numeric
);


--
-- Name: metodos_pago_guardados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago_guardados (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    cliente_id uuid NOT NULL,
    pasarela character varying(30) NOT NULL,
    stripe_customer_id character varying(255) NOT NULL,
    stripe_payment_method_id character varying(255) NOT NULL,
    marca character varying(20),
    ultimos_4 character varying(4),
    mes_expiracion smallint,
    anio_expiracion smallint,
    es_principal boolean DEFAULT false,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- Name: modificadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modificadores (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    precio_extra numeric(10,2) DEFAULT '0'::numeric,
    disponible boolean DEFAULT true,
    orden smallint DEFAULT 0
);


--
-- Name: modificadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modificadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modificadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modificadores_id_seq OWNED BY public.modificadores.id;


--
-- Name: nomina; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina (
    id integer NOT NULL,
    empleado_id uuid NOT NULL,
    periodo_inicio date NOT NULL,
    periodo_fin date NOT NULL,
    dias_trabajados numeric(5,2),
    horas_extra numeric(6,2) DEFAULT '0'::numeric,
    salario_base numeric(10,2) NOT NULL,
    bonos numeric(10,2) DEFAULT '0'::numeric,
    propinas numeric(10,2) DEFAULT '0'::numeric,
    descuento_imss numeric(10,2) DEFAULT '0'::numeric,
    descuento_isr numeric(10,2) DEFAULT '0'::numeric,
    otros_descuentos numeric(10,2) DEFAULT '0'::numeric,
    total_percepciones numeric(10,2),
    total_deducciones numeric(10,2),
    neto_pagar numeric(10,2),
    pagado boolean DEFAULT false,
    fecha_pago date,
    metodo_pago character varying(50),
    comprobante_url text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: nomina_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nomina_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_id_seq OWNED BY public.nomina.id;


--
-- Name: nomina_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_movimientos (
    id bigint NOT NULL,
    empleado_id uuid NOT NULL,
    tipo character varying(5) NOT NULL,
    concepto character varying(30) NOT NULL,
    monto numeric(10,2) NOT NULL,
    periodo_inicio date NOT NULL,
    periodo_fin date NOT NULL,
    fecha date DEFAULT now() NOT NULL,
    justificacion text NOT NULL,
    autor_id integer NOT NULL,
    corrige_id bigint,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nomina_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.nomina_movimientos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.nomina_movimientos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orden_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_items (
    id integer NOT NULL,
    orden_id uuid NOT NULL,
    platillo_id integer NOT NULL,
    variante_id integer,
    combo_id integer,
    cantidad smallint DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT '0'::numeric,
    subtotal numeric(10,2),
    estatus character varying(30) DEFAULT 'pendiente'::character varying,
    estacion_id integer,
    notas text,
    enviado_cocina boolean DEFAULT false,
    tiempo_envio timestamp with time zone,
    tiempo_listo timestamp with time zone,
    tiempo_entrega timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: orden_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_items_id_seq OWNED BY public.orden_items.id;


--
-- Name: ordenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordenes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    folio character varying(30),
    tipo character varying(30) DEFAULT 'mesa'::character varying NOT NULL,
    mesa_id integer,
    cliente_id uuid,
    reservacion_id uuid,
    atendido_por integer,
    num_comensales smallint DEFAULT 1,
    estatus character varying(30) DEFAULT 'abierta'::character varying,
    subtotal numeric(12,2) DEFAULT '0'::numeric,
    descuentos numeric(12,2) DEFAULT '0'::numeric,
    impuestos numeric(12,2) DEFAULT '0'::numeric,
    propina numeric(12,2) DEFAULT '0'::numeric,
    total numeric(12,2) DEFAULT '0'::numeric,
    notas_cliente text,
    notas_cocina text,
    prioridad smallint DEFAULT 0,
    tiempo_apertura timestamp with time zone DEFAULT now(),
    tiempo_cierre timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    direccion_envio_id integer,
    prob_cancelacion_sintetica numeric,
    cancelacion_sintetica boolean,
    motivo_cancelacion character varying(300),
    cancelado_por integer,
    cancelado_en timestamp with time zone
);


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    orden_id uuid NOT NULL,
    metodo_pago_id integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    cambio numeric(12,2) DEFAULT '0'::numeric,
    referencia character varying(100),
    propina numeric(12,2) DEFAULT '0'::numeric,
    cobrado_por integer,
    estatus character varying(20) DEFAULT 'completado'::character varying,
    creado_en timestamp with time zone DEFAULT now(),
    pasarela character varying(30),
    id_transaccion_pasarela character varying(255)
);


--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: perfiles_facturacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles_facturacion (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    cliente_id uuid NOT NULL,
    rfc character varying(13) NOT NULL,
    razon_social character varying(200) NOT NULL,
    uso_cfdi character varying(10) NOT NULL,
    regimen_fiscal character varying(50) NOT NULL,
    codigo_postal_fiscal character varying(5) NOT NULL,
    email character varying(150),
    es_principal boolean DEFAULT false,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: platillos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platillos (
    id integer NOT NULL,
    categoria_id integer NOT NULL,
    subcategoria_id integer,
    codigo character varying(30),
    nombre character varying(150) NOT NULL,
    descripcion text,
    descripcion_corta character varying(255),
    imagen_url text,
    precio numeric(10,2) NOT NULL,
    precio_costo numeric(10,2),
    tiempo_preparacion integer,
    es_vegetariano boolean DEFAULT false,
    es_vegano boolean DEFAULT false,
    es_sin_gluten boolean DEFAULT false,
    es_picante boolean DEFAULT false,
    nivel_picante smallint,
    es_popular boolean DEFAULT false,
    es_nuevo boolean DEFAULT false,
    es_del_chef boolean DEFAULT false,
    disponible boolean DEFAULT true,
    disponible_takeout boolean DEFAULT true,
    orden smallint DEFAULT 0,
    notas_cocina text,
    fecha_alta date DEFAULT CURRENT_DATE,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT platillos_nivel_picante_check CHECK (((nivel_picante >= 0) AND (nivel_picante <= 5)))
);


--
-- Name: platillos_alergenos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platillos_alergenos (
    platillo_id integer NOT NULL,
    alergeno_id integer NOT NULL
);


--
-- Name: platillos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platillos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platillos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platillos_id_seq OWNED BY public.platillos.id;


--
-- Name: platillos_modificadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platillos_modificadores (
    platillo_id integer NOT NULL,
    grupo_id integer NOT NULL
);


--
-- Name: promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promociones (
    id integer NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    badge text,
    emoji text,
    color text,
    precio_original numeric(10,2),
    precio_descuento numeric(10,2),
    imagen_url text,
    imagen_public_id text,
    activa boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: promociones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promociones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promociones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promociones_id_seq OWNED BY public.promociones.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    nombre_contacto character varying(150),
    rfc character varying(20),
    email character varying(150),
    telefono character varying(20),
    whatsapp character varying(20),
    sitio_web character varying(255),
    direccion text,
    ciudad character varying(100),
    dias_credito integer DEFAULT 0,
    calificacion numeric(3,1),
    activo boolean DEFAULT true,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT proveedores_calificacion_check CHECK (((calificacion >= (0)::numeric) AND (calificacion <= (5)::numeric)))
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: proveedores_ingredientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores_ingredientes (
    proveedor_id integer NOT NULL,
    ingrediente_id integer NOT NULL,
    precio numeric(10,4) NOT NULL,
    unidad_id integer NOT NULL,
    tiempo_entrega integer,
    es_principal boolean DEFAULT false,
    codigo_proveedor character varying(50)
);


--
-- Name: puestos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puestos (
    id integer NOT NULL,
    departamento_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    nivel smallint DEFAULT 1,
    salario_base numeric(10,2),
    activo boolean DEFAULT true
);


--
-- Name: puestos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.puestos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: puestos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.puestos_id_seq OWNED BY public.puestos.id;


--
-- Name: recetas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recetas (
    id integer NOT NULL,
    platillo_id integer NOT NULL,
    variante_id integer,
    version smallint DEFAULT 1,
    activa boolean DEFAULT true,
    costo_calculado numeric(10,4),
    margen_pct numeric(5,2),
    procedimiento text,
    foto_emplatado text,
    tiempo_prep_min integer,
    porcion_gramos numeric(7,2),
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: recetas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recetas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recetas_id_seq OWNED BY public.recetas.id;


--
-- Name: recetas_ingredientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recetas_ingredientes (
    id integer NOT NULL,
    receta_id integer NOT NULL,
    ingrediente_id integer NOT NULL,
    cantidad numeric(10,4) NOT NULL,
    unidad_id integer NOT NULL,
    es_opcional boolean DEFAULT false,
    notas character varying(255)
);


--
-- Name: recetas_ingredientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recetas_ingredientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recetas_ingredientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recetas_ingredientes_id_seq OWNED BY public.recetas_ingredientes.id;


--
-- Name: reembolsos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reembolsos (
    id integer NOT NULL,
    pago_id integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    motivo text,
    aprobado_por integer,
    metodo_devolucion character varying(50),
    referencia character varying(100),
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: reembolsos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reembolsos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reembolsos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reembolsos_id_seq OWNED BY public.reembolsos.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: registros_eliminados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_eliminados (
    id bigint NOT NULL,
    tabla_origen character varying(63) NOT NULL,
    registro_id text NOT NULL,
    datos jsonb NOT NULL,
    motivo character varying(300),
    autor_id integer,
    eliminado_en timestamp with time zone DEFAULT now() NOT NULL,
    restaurado_en timestamp with time zone,
    restaurado_por integer
);


--
-- Name: registros_eliminados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.registros_eliminados ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.registros_eliminados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reportes_problemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reportes_problemas (
    id bigint NOT NULL,
    tipo character varying(20) NOT NULL,
    descripcion text NOT NULL,
    ruta character varying(300) NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reportes_problemas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reportes_problemas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reportes_problemas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reservaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservaciones (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    mesa_id integer,
    user_id integer,
    cliente_nombre character varying(150) NOT NULL,
    cliente_telefono character varying(20),
    cliente_email character varying(150),
    fecha_hora timestamp with time zone NOT NULL,
    duracion_min integer DEFAULT 90,
    num_comensales smallint NOT NULL,
    ocasion character varying(80),
    peticiones_especiales text,
    estatus character varying(30) DEFAULT 'confirmada'::character varying,
    canal character varying(30) DEFAULT 'telefono'::character varying,
    recordatorio_enviado boolean DEFAULT false,
    no_show boolean DEFAULT false,
    deposito_requerido numeric(10,2) DEFAULT '0'::numeric,
    deposito_pagado numeric(10,2) DEFAULT '0'::numeric,
    notas text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    es_sintetica boolean,
    motivo_cancelacion character varying(300),
    cancelado_por integer,
    cancelado_en timestamp with time zone
);


--
-- Name: restaurante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurante (
    id integer NOT NULL,
    nombre character varying(150) DEFAULT 'El Quijote'::character varying NOT NULL,
    nombre_legal character varying(200),
    rfc character varying(20),
    logo_url text,
    slogan character varying(255),
    descripcion text,
    direccion character varying(200) DEFAULT 'Calle Morelos #32, Esq. Hidalgo'::character varying NOT NULL,
    colonia character varying(100) DEFAULT 'Zona Centro'::character varying,
    ciudad character varying(100) DEFAULT 'Huejutla de Reyes'::character varying,
    estado character varying(100) DEFAULT 'Hidalgo'::character varying,
    codigo_postal character varying(10) DEFAULT '43000'::character varying,
    latitud numeric(10,7) DEFAULT 21.1378,
    longitud numeric(10,7) DEFAULT '-98.4186'::numeric,
    telefono character varying(20) DEFAULT '+52 771 702 8172'::character varying,
    whatsapp character varying(20),
    email character varying(150),
    facebook_url text DEFAULT 'https://www.facebook.com/ElQuijote.Huejutla'::text,
    instagram_url text,
    moneda character(3) DEFAULT 'MXN'::bpchar,
    zona_horaria character varying(60) DEFAULT 'America/Mexico_City'::character varying,
    impuesto_pct numeric(5,2) DEFAULT 16.00,
    propina_sugerida_pct numeric(5,2) DEFAULT 10.00,
    formato_folio character varying(30) DEFAULT 'QJT-NNNNNN'::character varying,
    mensaje_ticket text DEFAULT '¡Gracias por su visita a El Quijote!'::text,
    pie_ticket text DEFAULT 'Calle Morelos #32 Esq. Hidalgo, Huejutla de Reyes, Hgo.'::text,
    tiempo_espera_min integer DEFAULT 15,
    acepta_reservas boolean DEFAULT true,
    acepta_takeout boolean DEFAULT true,
    permite_propina_tarjeta boolean DEFAULT true,
    politica_cancelacion text,
    anio_fundacion integer,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    duracion_reserva_default integer DEFAULT 90,
    dias_confirmacion integer DEFAULT 3
);


--
-- Name: restaurante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurante_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurante_id_seq OWNED BY public.restaurante.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    permissions jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: solicitudes_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_factura (
    id bigint NOT NULL,
    orden_id uuid NOT NULL,
    usuario_id integer NOT NULL,
    datos jsonb NOT NULL,
    estatus text DEFAULT 'pendiente'::text NOT NULL,
    motivo text,
    factura_id uuid,
    atendida_por integer,
    atendida_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT solicitudes_factura_estatus_check CHECK ((estatus = ANY (ARRAY['pendiente'::text, 'emitida'::text, 'rechazada'::text])))
);


--
-- Name: solicitudes_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitudes_factura ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitudes_factura_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stripe_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_events (
    event_id text NOT NULL,
    type text,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subcategorias_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategorias_menu (
    id integer NOT NULL,
    categoria_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    orden smallint DEFAULT 0,
    activa boolean DEFAULT true
);


--
-- Name: subcategorias_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subcategorias_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subcategorias_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subcategorias_menu_id_seq OWNED BY public.subcategorias_menu.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_medida (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    abreviatura character varying(10) NOT NULL,
    tipo character varying(20)
);


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_medida_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_medida_id_seq OWNED BY public.unidades_medida.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    lastname character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    password text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    login_attempts integer DEFAULT 0 NOT NULL,
    login_lock_until bigint DEFAULT 0 NOT NULL,
    recovery_attempts integer DEFAULT 0 NOT NULL,
    recovery_lock_until bigint DEFAULT 0 NOT NULL,
    session_time bigint DEFAULT 0 NOT NULL,
    role_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_ordenes_detalle; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ordenes_detalle AS
 SELECT o.id,
    o.folio,
    o.tipo,
    o.estatus,
    o.creado_en,
    m.numero AS mesa,
    a.nombre AS area,
    (((u.name)::text || ' '::text) || (u.lastname)::text) AS atendido_por,
    o.num_comensales,
    o.subtotal,
    o.descuentos,
    o.impuestos,
    o.propina,
    o.total
   FROM (((public.ordenes o
     LEFT JOIN public.mesas m ON ((m.id = o.mesa_id)))
     LEFT JOIN public.areas_salon a ON ((a.id = m.area_id)))
     LEFT JOIN public.users u ON ((u.id = o.atendido_por)));


--
-- Name: v_stock_ingredientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_ingredientes AS
 SELECT i.id,
    i.nombre,
    i.stock_actual,
    i.stock_minimo,
    um.abreviatura AS unidad,
        CASE
            WHEN (i.stock_actual <= (0)::numeric) THEN 'agotado'::text
            WHEN (i.stock_actual <= i.stock_minimo) THEN 'bajo'::text
            ELSE 'ok'::text
        END AS alerta
   FROM (public.ingredientes i
     JOIN public.unidades_medida um ON ((um.id = i.unidad_uso_id)))
  WHERE (i.activo = true);


--
-- Name: v_usuarios_perfil; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_usuarios_perfil AS
 SELECT u.id,
    u.name,
    u.lastname,
    u.email,
    u.phone,
    u.is_active,
    r.name AS rol,
    r.permissions,
    e.id AS empleado_id,
    e.numero_empleado,
    p.nombre AS puesto,
    d.nombre AS departamento
   FROM ((((public.users u
     JOIN public.roles r ON ((r.id = u.role_id)))
     LEFT JOIN public.empleados e ON ((e.user_id = u.id)))
     LEFT JOIN public.puestos p ON ((p.id = e.puesto_id)))
     LEFT JOIN public.departamentos d ON ((d.id = p.departamento_id)));


--
-- Name: v_ventas_platillo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ventas_platillo AS
 SELECT p.id,
    p.nombre,
    p.precio,
    count(oi.id) AS veces_ordenado,
    sum(oi.cantidad) AS unidades_vendidas,
    sum(oi.subtotal) AS ingresos_totales
   FROM ((public.platillos p
     JOIN public.orden_items oi ON ((oi.platillo_id = p.id)))
     JOIN public.ordenes o ON (((o.id = oi.orden_id) AND ((o.estatus)::text = 'pagada'::text))))
  GROUP BY p.id, p.nombre, p.precio;


--
-- Name: v_ventas_por_dia; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ventas_por_dia AS
 SELECT date(creado_en) AS fecha,
    count(DISTINCT id) AS total_ordenes,
    sum(total) AS total_ventas,
    avg(total) AS ticket_promedio,
    sum(propina) AS total_propinas
   FROM public.ordenes o
  WHERE ((estatus)::text = 'pagada'::text)
  GROUP BY (date(creado_en))
  ORDER BY (date(creado_en)) DESC;


--
-- Name: variantes_platillo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variantes_platillo (
    id integer NOT NULL,
    platillo_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    precio_extra numeric(10,2) DEFAULT '0'::numeric,
    precio_total numeric(10,2),
    disponible boolean DEFAULT true,
    orden smallint DEFAULT 0
);


--
-- Name: variantes_platillo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.variantes_platillo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: variantes_platillo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.variantes_platillo_id_seq OWNED BY public.variantes_platillo.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    platillo_id integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: alergenos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alergenos ALTER COLUMN id SET DEFAULT nextval('public.alergenos_id_seq'::regclass);


--
-- Name: areas_salon id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas_salon ALTER COLUMN id SET DEFAULT nextval('public.areas_salon_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: categorias_gasto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_gasto ALTER COLUMN id SET DEFAULT nextval('public.categorias_gasto_id_seq'::regclass);


--
-- Name: categorias_ingrediente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_ingrediente ALTER COLUMN id SET DEFAULT nextval('public.categorias_ingrediente_id_seq'::regclass);


--
-- Name: categorias_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_menu ALTER COLUMN id SET DEFAULT nextval('public.categorias_menu_id_seq'::regclass);


--
-- Name: cierres_caja id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierres_caja ALTER COLUMN id SET DEFAULT nextval('public.cierres_caja_id_seq'::regclass);


--
-- Name: combos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combos ALTER COLUMN id SET DEFAULT nextval('public.combos_id_seq'::regclass);


--
-- Name: cupones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupones ALTER COLUMN id SET DEFAULT nextval('public.cupones_id_seq'::regclass);


--
-- Name: departamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos ALTER COLUMN id SET DEFAULT nextval('public.departamentos_id_seq'::regclass);


--
-- Name: device_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens ALTER COLUMN id SET DEFAULT nextval('public.device_tokens_id_seq'::regclass);


--
-- Name: direcciones_cliente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones_cliente ALTER COLUMN id SET DEFAULT nextval('public.direcciones_cliente_id_seq'::regclass);


--
-- Name: estaciones_cocina id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_cocina ALTER COLUMN id SET DEFAULT nextval('public.estaciones_cocina_id_seq'::regclass);


--
-- Name: estatus_mesa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatus_mesa ALTER COLUMN id SET DEFAULT nextval('public.estatus_mesa_id_seq'::regclass);


--
-- Name: grupos_modificadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos_modificadores ALTER COLUMN id SET DEFAULT nextval('public.grupos_modificadores_id_seq'::regclass);


--
-- Name: horarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios ALTER COLUMN id SET DEFAULT nextval('public.horarios_id_seq'::regclass);


--
-- Name: horarios_especiales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_especiales ALTER COLUMN id SET DEFAULT nextval('public.horarios_especiales_id_seq'::regclass);


--
-- Name: ingredientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes ALTER COLUMN id SET DEFAULT nextval('public.ingredientes_id_seq'::regclass);


--
-- Name: inventario_mermas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_mermas ALTER COLUMN id SET DEFAULT nextval('public.inventario_mermas_id_seq'::regclass);


--
-- Name: inventario_ordenes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_ordenes ALTER COLUMN id SET DEFAULT nextval('public.inventario_ordenes_id_seq'::regclass);


--
-- Name: inventario_productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_productos ALTER COLUMN id SET DEFAULT nextval('public.inventario_productos_id_seq'::regclass);


--
-- Name: inventario_proveedor_producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedor_producto ALTER COLUMN id SET DEFAULT nextval('public.inventario_proveedor_producto_id_seq'::regclass);


--
-- Name: inventario_proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedores ALTER COLUMN id SET DEFAULT nextval('public.inventario_proveedores_id_seq'::regclass);


--
-- Name: logs_auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria ALTER COLUMN id SET DEFAULT nextval('public.logs_auditoria_id_seq'::regclass);


--
-- Name: menus_del_dia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia ALTER COLUMN id SET DEFAULT nextval('public.menus_del_dia_id_seq'::regclass);


--
-- Name: menus_del_dia_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia_items ALTER COLUMN id SET DEFAULT nextval('public.menus_del_dia_items_id_seq'::regclass);


--
-- Name: mesas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);


--
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: modificadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores ALTER COLUMN id SET DEFAULT nextval('public.modificadores_id_seq'::regclass);


--
-- Name: nomina id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina ALTER COLUMN id SET DEFAULT nextval('public.nomina_id_seq'::regclass);


--
-- Name: orden_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items ALTER COLUMN id SET DEFAULT nextval('public.orden_items_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: platillos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos ALTER COLUMN id SET DEFAULT nextval('public.platillos_id_seq'::regclass);


--
-- Name: promociones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones ALTER COLUMN id SET DEFAULT nextval('public.promociones_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: puestos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos ALTER COLUMN id SET DEFAULT nextval('public.puestos_id_seq'::regclass);


--
-- Name: recetas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas ALTER COLUMN id SET DEFAULT nextval('public.recetas_id_seq'::regclass);


--
-- Name: recetas_ingredientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes ALTER COLUMN id SET DEFAULT nextval('public.recetas_ingredientes_id_seq'::regclass);


--
-- Name: reembolsos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reembolsos ALTER COLUMN id SET DEFAULT nextval('public.reembolsos_id_seq'::regclass);


--
-- Name: restaurante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurante ALTER COLUMN id SET DEFAULT nextval('public.restaurante_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: subcategorias_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategorias_menu ALTER COLUMN id SET DEFAULT nextval('public.subcategorias_menu_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: unidades_medida id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida ALTER COLUMN id SET DEFAULT nextval('public.unidades_medida_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: variantes_platillo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_platillo ALTER COLUMN id SET DEFAULT nextval('public.variantes_platillo_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Name: alergenos alergenos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alergenos
    ADD CONSTRAINT alergenos_nombre_key UNIQUE (nombre);


--
-- Name: alergenos alergenos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alergenos
    ADD CONSTRAINT alergenos_pkey PRIMARY KEY (id);


--
-- Name: areas_salon areas_salon_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas_salon
    ADD CONSTRAINT areas_salon_nombre_key UNIQUE (nombre);


--
-- Name: areas_salon areas_salon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas_salon
    ADD CONSTRAINT areas_salon_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: categorias_estacion categorias_estacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_estacion
    ADD CONSTRAINT categorias_estacion_pkey PRIMARY KEY (estacion_id, categoria_id);


--
-- Name: categorias_gasto categorias_gasto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_nombre_key UNIQUE (nombre);


--
-- Name: categorias_gasto categorias_gasto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_pkey PRIMARY KEY (id);


--
-- Name: categorias_ingrediente categorias_ingrediente_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_ingrediente
    ADD CONSTRAINT categorias_ingrediente_nombre_key UNIQUE (nombre);


--
-- Name: categorias_ingrediente categorias_ingrediente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_ingrediente
    ADD CONSTRAINT categorias_ingrediente_pkey PRIMARY KEY (id);


--
-- Name: categorias_menu categorias_menu_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_menu
    ADD CONSTRAINT categorias_menu_nombre_key UNIQUE (nombre);


--
-- Name: categorias_menu categorias_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_menu
    ADD CONSTRAINT categorias_menu_pkey PRIMARY KEY (id);


--
-- Name: cierres_caja cierres_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierres_caja
    ADD CONSTRAINT cierres_caja_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_user_id_key UNIQUE (user_id);


--
-- Name: combos combos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT combos_pkey PRIMARY KEY (id);


--
-- Name: consentimientos consentimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimientos
    ADD CONSTRAINT consentimientos_pkey PRIMARY KEY (id);


--
-- Name: cupones cupones_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupones
    ADD CONSTRAINT cupones_codigo_key UNIQUE (codigo);


--
-- Name: cupones cupones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupones
    ADD CONSTRAINT cupones_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_nombre_key UNIQUE (nombre);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_unique UNIQUE (token);


--
-- Name: direcciones_cliente direcciones_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones_cliente
    ADD CONSTRAINT direcciones_cliente_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_curp_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_curp_key UNIQUE (curp);


--
-- Name: empleados empleados_nss_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_nss_key UNIQUE (nss);


--
-- Name: empleados empleados_numero_empleado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_numero_empleado_key UNIQUE (numero_empleado);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_rfc_empleado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_rfc_empleado_key UNIQUE (rfc_empleado);


--
-- Name: empleados empleados_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_user_id_key UNIQUE (user_id);


--
-- Name: estaciones_cocina estaciones_cocina_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_cocina
    ADD CONSTRAINT estaciones_cocina_nombre_key UNIQUE (nombre);


--
-- Name: estaciones_cocina estaciones_cocina_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_cocina
    ADD CONSTRAINT estaciones_cocina_pkey PRIMARY KEY (id);


--
-- Name: estatus_mesa estatus_mesa_mesa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatus_mesa
    ADD CONSTRAINT estatus_mesa_mesa_id_key UNIQUE (mesa_id);


--
-- Name: estatus_mesa estatus_mesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatus_mesa
    ADD CONSTRAINT estatus_mesa_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_folio_fiscal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_folio_fiscal_key UNIQUE (folio_fiscal);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: grupos_modificadores grupos_modificadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos_modificadores
    ADD CONSTRAINT grupos_modificadores_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_dia_semana_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_dia_semana_key UNIQUE (dia_semana);


--
-- Name: horarios_especiales horarios_especiales_fecha_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_especiales
    ADD CONSTRAINT horarios_especiales_fecha_key UNIQUE (fecha);


--
-- Name: horarios_especiales horarios_especiales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_especiales
    ADD CONSTRAINT horarios_especiales_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- Name: ingredientes ingredientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes
    ADD CONSTRAINT ingredientes_pkey PRIMARY KEY (id);


--
-- Name: inventario_mermas inventario_mermas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_mermas
    ADD CONSTRAINT inventario_mermas_pkey PRIMARY KEY (id);


--
-- Name: inventario_ordenes inventario_ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_ordenes
    ADD CONSTRAINT inventario_ordenes_pkey PRIMARY KEY (id);


--
-- Name: inventario_productos inventario_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_productos
    ADD CONSTRAINT inventario_productos_pkey PRIMARY KEY (id);


--
-- Name: inventario_proveedor_producto inventario_proveedor_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedor_producto
    ADD CONSTRAINT inventario_proveedor_producto_pkey PRIMARY KEY (id);


--
-- Name: inventario_proveedor_producto inventario_proveedor_producto_proveedor_id_producto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedor_producto
    ADD CONSTRAINT inventario_proveedor_producto_proveedor_id_producto_id_key UNIQUE (proveedor_id, producto_id);


--
-- Name: inventario_proveedores inventario_proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedores
    ADD CONSTRAINT inventario_proveedores_pkey PRIMARY KEY (id);


--
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);


--
-- Name: menus_del_dia_items menus_del_dia_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia_items
    ADD CONSTRAINT menus_del_dia_items_pkey PRIMARY KEY (id);


--
-- Name: menus_del_dia menus_del_dia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia
    ADD CONSTRAINT menus_del_dia_pkey PRIMARY KEY (id);


--
-- Name: mesas mesas_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_numero_key UNIQUE (numero);


--
-- Name: mesas mesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago_guardados metodos_pago_guardados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago_guardados
    ADD CONSTRAINT metodos_pago_guardados_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago metodos_pago_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_nombre_key UNIQUE (nombre);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: modificadores modificadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_pkey PRIMARY KEY (id);


--
-- Name: nomina_movimientos nomina_movimientos_corrige_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_movimientos
    ADD CONSTRAINT nomina_movimientos_corrige_id_unique UNIQUE (corrige_id);


--
-- Name: nomina_movimientos nomina_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_movimientos
    ADD CONSTRAINT nomina_movimientos_pkey PRIMARY KEY (id);


--
-- Name: nomina nomina_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina
    ADD CONSTRAINT nomina_pkey PRIMARY KEY (id);


--
-- Name: orden_items orden_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_pkey PRIMARY KEY (id);


--
-- Name: ordenes ordenes_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_folio_key UNIQUE (folio);


--
-- Name: ordenes ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: perfiles_facturacion perfiles_facturacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_facturacion
    ADD CONSTRAINT perfiles_facturacion_pkey PRIMARY KEY (id);


--
-- Name: platillos_alergenos platillos_alergenos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_alergenos
    ADD CONSTRAINT platillos_alergenos_pkey PRIMARY KEY (platillo_id, alergeno_id);


--
-- Name: platillos platillos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos
    ADD CONSTRAINT platillos_codigo_key UNIQUE (codigo);


--
-- Name: platillos_modificadores platillos_modificadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_modificadores
    ADD CONSTRAINT platillos_modificadores_pkey PRIMARY KEY (platillo_id, grupo_id);


--
-- Name: platillos platillos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos
    ADD CONSTRAINT platillos_pkey PRIMARY KEY (id);


--
-- Name: promociones promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_pkey PRIMARY KEY (id);


--
-- Name: proveedores_ingredientes proveedores_ingredientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_ingredientes
    ADD CONSTRAINT proveedores_ingredientes_pkey PRIMARY KEY (proveedor_id, ingrediente_id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: puestos puestos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT puestos_pkey PRIMARY KEY (id);


--
-- Name: recetas_ingredientes recetas_ingredientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes
    ADD CONSTRAINT recetas_ingredientes_pkey PRIMARY KEY (id);


--
-- Name: recetas_ingredientes recetas_ingredientes_receta_id_ingrediente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes
    ADD CONSTRAINT recetas_ingredientes_receta_id_ingrediente_id_key UNIQUE (receta_id, ingrediente_id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (id);


--
-- Name: reembolsos reembolsos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reembolsos
    ADD CONSTRAINT reembolsos_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: registros_eliminados registros_eliminados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_eliminados
    ADD CONSTRAINT registros_eliminados_pkey PRIMARY KEY (id);


--
-- Name: reportes_problemas reportes_problemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reportes_problemas
    ADD CONSTRAINT reportes_problemas_pkey PRIMARY KEY (id);


--
-- Name: reservaciones reservaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservaciones
    ADD CONSTRAINT reservaciones_pkey PRIMARY KEY (id);


--
-- Name: restaurante restaurante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurante
    ADD CONSTRAINT restaurante_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_factura solicitudes_factura_orden_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_orden_id_key UNIQUE (orden_id);


--
-- Name: solicitudes_factura solicitudes_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_pkey PRIMARY KEY (id);


--
-- Name: stripe_events stripe_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_events
    ADD CONSTRAINT stripe_events_pkey PRIMARY KEY (event_id);


--
-- Name: subcategorias_menu subcategorias_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategorias_menu
    ADD CONSTRAINT subcategorias_menu_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: unidades_medida unidades_medida_abreviatura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_abreviatura_key UNIQUE (abreviatura);


--
-- Name: unidades_medida unidades_medida_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_nombre_key UNIQUE (nombre);


--
-- Name: unidades_medida unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variantes_platillo variantes_platillo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_platillo
    ADD CONSTRAINT variantes_platillo_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: device_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX device_tokens_user_id_idx ON public.device_tokens USING btree (user_id);


--
-- Name: idx_categorias_estacion_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categorias_estacion_categoria_id ON public.categorias_estacion USING btree (categoria_id);


--
-- Name: idx_cierres_caja_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cierres_caja_user_id ON public.cierres_caja USING btree (user_id);


--
-- Name: idx_clientes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_user ON public.clientes USING btree (user_id);


--
-- Name: idx_consentimientos_user_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consentimientos_user_tipo ON public.consentimientos USING btree (user_id, tipo, creado_en DESC);


--
-- Name: idx_direcciones_cliente_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direcciones_cliente_cliente_id ON public.direcciones_cliente USING btree (cliente_id);


--
-- Name: idx_empleados_puesto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_puesto_id ON public.empleados USING btree (puesto_id);


--
-- Name: idx_empleados_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_user ON public.empleados USING btree (user_id);


--
-- Name: idx_estatus_mesa_orden_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estatus_mesa_orden_id ON public.estatus_mesa USING btree (orden_id);


--
-- Name: idx_facturas_orden_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_orden_id ON public.facturas USING btree (orden_id);


--
-- Name: idx_facturas_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_user_id ON public.facturas USING btree (user_id);


--
-- Name: idx_ingredientes_alergeno_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredientes_alergeno_id ON public.ingredientes USING btree (alergeno_id);


--
-- Name: idx_ingredientes_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredientes_categoria_id ON public.ingredientes USING btree (categoria_id);


--
-- Name: idx_ingredientes_unidad_compra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredientes_unidad_compra_id ON public.ingredientes USING btree (unidad_compra_id);


--
-- Name: idx_ingredientes_unidad_uso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredientes_unidad_uso_id ON public.ingredientes USING btree (unidad_uso_id);


--
-- Name: idx_inventario_mermas_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_mermas_product_id ON public.inventario_mermas USING btree (product_id);


--
-- Name: idx_inventario_mermas_reportado_por_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_mermas_reportado_por_id ON public.inventario_mermas USING btree (reportado_por_id);


--
-- Name: idx_inventario_ordenes_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_ordenes_supplier_id ON public.inventario_ordenes USING btree (supplier_id);


--
-- Name: idx_inventario_proveedor_producto_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_proveedor_producto_producto_id ON public.inventario_proveedor_producto USING btree (producto_id);


--
-- Name: idx_logs_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_fecha ON public.logs_auditoria USING btree (creado_en);


--
-- Name: idx_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_user ON public.logs_auditoria USING btree (user_id);


--
-- Name: idx_menus_del_dia_items_menu_dia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_del_dia_items_menu_dia_id ON public.menus_del_dia_items USING btree (menu_dia_id);


--
-- Name: idx_menus_del_dia_items_platillo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_del_dia_items_platillo_id ON public.menus_del_dia_items USING btree (platillo_id);


--
-- Name: idx_mesas_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mesas_area_id ON public.mesas USING btree (area_id);


--
-- Name: idx_metodos_pago_guardados_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metodos_pago_guardados_cliente_id ON public.metodos_pago_guardados USING btree (cliente_id);


--
-- Name: idx_modificadores_grupo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modificadores_grupo_id ON public.modificadores USING btree (grupo_id);


--
-- Name: idx_nomina_empleado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nomina_empleado_id ON public.nomina USING btree (empleado_id);


--
-- Name: idx_nomina_movimientos_autor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nomina_movimientos_autor_id ON public.nomina_movimientos USING btree (autor_id);


--
-- Name: idx_nomina_movimientos_empleado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nomina_movimientos_empleado ON public.nomina_movimientos USING btree (empleado_id, periodo_inicio);


--
-- Name: idx_orden_items_combo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_items_combo_id ON public.orden_items USING btree (combo_id);


--
-- Name: idx_orden_items_estacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_items_estacion_id ON public.orden_items USING btree (estacion_id);


--
-- Name: idx_orden_items_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_items_orden ON public.orden_items USING btree (orden_id);


--
-- Name: idx_orden_items_platillo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_items_platillo ON public.orden_items USING btree (platillo_id);


--
-- Name: idx_orden_items_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_items_variante_id ON public.orden_items USING btree (variante_id);


--
-- Name: idx_ordenes_atendido_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_atendido_por ON public.ordenes USING btree (atendido_por);


--
-- Name: idx_ordenes_cancelado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_cancelado_por ON public.ordenes USING btree (cancelado_por);


--
-- Name: idx_ordenes_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_cliente_id ON public.ordenes USING btree (cliente_id);


--
-- Name: idx_ordenes_direccion_envio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_direccion_envio_id ON public.ordenes USING btree (direccion_envio_id);


--
-- Name: idx_ordenes_estatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_estatus ON public.ordenes USING btree (estatus);


--
-- Name: idx_ordenes_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_fecha ON public.ordenes USING btree (creado_en);


--
-- Name: idx_ordenes_mesa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_mesa ON public.ordenes USING btree (mesa_id);


--
-- Name: idx_ordenes_reservacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_reservacion_id ON public.ordenes USING btree (reservacion_id);


--
-- Name: idx_pagos_cobrado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_cobrado_por ON public.pagos USING btree (cobrado_por);


--
-- Name: idx_pagos_metodo_pago_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_metodo_pago_id ON public.pagos USING btree (metodo_pago_id);


--
-- Name: idx_pagos_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_orden ON public.pagos USING btree (orden_id);


--
-- Name: idx_perfiles_facturacion_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perfiles_facturacion_cliente_id ON public.perfiles_facturacion USING btree (cliente_id);


--
-- Name: idx_platillos_alergenos_alergeno_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platillos_alergenos_alergeno_id ON public.platillos_alergenos USING btree (alergeno_id);


--
-- Name: idx_platillos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platillos_categoria ON public.platillos USING btree (categoria_id);


--
-- Name: idx_platillos_disponible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platillos_disponible ON public.platillos USING btree (disponible);


--
-- Name: idx_platillos_modificadores_grupo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platillos_modificadores_grupo_id ON public.platillos_modificadores USING btree (grupo_id);


--
-- Name: idx_platillos_subcategoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platillos_subcategoria_id ON public.platillos USING btree (subcategoria_id);


--
-- Name: idx_proveedores_ingredientes_ingrediente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_ingredientes_ingrediente_id ON public.proveedores_ingredientes USING btree (ingrediente_id);


--
-- Name: idx_proveedores_ingredientes_unidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_ingredientes_unidad_id ON public.proveedores_ingredientes USING btree (unidad_id);


--
-- Name: idx_puestos_departamento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puestos_departamento_id ON public.puestos USING btree (departamento_id);


--
-- Name: idx_recetas_ingredientes_ingrediente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_ingredientes_ingrediente_id ON public.recetas_ingredientes USING btree (ingrediente_id);


--
-- Name: idx_recetas_ingredientes_unidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_ingredientes_unidad_id ON public.recetas_ingredientes USING btree (unidad_id);


--
-- Name: idx_recetas_platillo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_platillo_id ON public.recetas USING btree (platillo_id);


--
-- Name: idx_recetas_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_variante_id ON public.recetas USING btree (variante_id);


--
-- Name: idx_reembolsos_aprobado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reembolsos_aprobado_por ON public.reembolsos USING btree (aprobado_por);


--
-- Name: idx_reembolsos_pago_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reembolsos_pago_id ON public.reembolsos USING btree (pago_id);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_registros_eliminados_autor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registros_eliminados_autor_id ON public.registros_eliminados USING btree (autor_id);


--
-- Name: idx_registros_eliminados_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registros_eliminados_origen ON public.registros_eliminados USING btree (tabla_origen, registro_id);


--
-- Name: idx_registros_eliminados_restaurado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registros_eliminados_restaurado_por ON public.registros_eliminados USING btree (restaurado_por);


--
-- Name: idx_reservaciones_cancelado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservaciones_cancelado_por ON public.reservaciones USING btree (cancelado_por);


--
-- Name: idx_reservaciones_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservaciones_fecha ON public.reservaciones USING btree (fecha_hora);


--
-- Name: idx_reservaciones_mesa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservaciones_mesa_id ON public.reservaciones USING btree (mesa_id);


--
-- Name: idx_reservaciones_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservaciones_user_id ON public.reservaciones USING btree (user_id);


--
-- Name: idx_solicitudes_factura_atendida_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_factura_atendida_por ON public.solicitudes_factura USING btree (atendida_por);


--
-- Name: idx_solicitudes_factura_estatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_factura_estatus ON public.solicitudes_factura USING btree (estatus, creado_en);


--
-- Name: idx_solicitudes_factura_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_factura_factura ON public.solicitudes_factura USING btree (factura_id);


--
-- Name: idx_solicitudes_factura_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_factura_usuario ON public.solicitudes_factura USING btree (usuario_id);


--
-- Name: idx_subcategorias_menu_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcategorias_menu_categoria_id ON public.subcategorias_menu USING btree (categoria_id);


--
-- Name: idx_variantes_platillo_platillo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variantes_platillo_platillo_id ON public.variantes_platillo USING btree (platillo_id);


--
-- Name: idx_ventas_platillo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_platillo_id ON public.ventas USING btree (platillo_id);


--
-- Name: reportes_problemas_creado_en_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reportes_problemas_creado_en_idx ON public.reportes_problemas USING btree (creado_en DESC NULLS LAST);


--
-- Name: users_email_lower_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_lower_key ON public.users USING btree (lower((email)::text));


--
-- Name: nomina_movimientos trg_nomina_movimientos_correccion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nomina_movimientos_correccion BEFORE INSERT ON public.nomina_movimientos FOR EACH ROW EXECUTE FUNCTION public.fn_nomina_movimientos_correccion();


--
-- Name: nomina_movimientos trg_nomina_movimientos_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_nomina_movimientos_inmutable BEFORE DELETE OR UPDATE ON public.nomina_movimientos FOR EACH ROW EXECUTE FUNCTION public.fn_nomina_movimientos_inmutable();


--
-- Name: categorias_estacion categorias_estacion_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_estacion
    ADD CONSTRAINT categorias_estacion_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_menu(id);


--
-- Name: categorias_estacion categorias_estacion_estacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_estacion
    ADD CONSTRAINT categorias_estacion_estacion_id_fkey FOREIGN KEY (estacion_id) REFERENCES public.estaciones_cocina(id);


--
-- Name: cierres_caja cierres_caja_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierres_caja
    ADD CONSTRAINT cierres_caja_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clientes clientes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: consentimientos consentimientos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimientos
    ADD CONSTRAINT consentimientos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direcciones_cliente direcciones_cliente_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones_cliente
    ADD CONSTRAINT direcciones_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: empleados empleados_puesto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_puesto_id_fkey FOREIGN KEY (puesto_id) REFERENCES public.puestos(id);


--
-- Name: empleados empleados_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: estatus_mesa estatus_mesa_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatus_mesa
    ADD CONSTRAINT estatus_mesa_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: facturas facturas_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id);


--
-- Name: facturas facturas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: estatus_mesa fk_estatus_mesa_orden; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatus_mesa
    ADD CONSTRAINT fk_estatus_mesa_orden FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE SET NULL;


--
-- Name: ingredientes ingredientes_alergeno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes
    ADD CONSTRAINT ingredientes_alergeno_id_fkey FOREIGN KEY (alergeno_id) REFERENCES public.alergenos(id);


--
-- Name: ingredientes ingredientes_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes
    ADD CONSTRAINT ingredientes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_ingrediente(id);


--
-- Name: ingredientes ingredientes_unidad_compra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes
    ADD CONSTRAINT ingredientes_unidad_compra_id_fkey FOREIGN KEY (unidad_compra_id) REFERENCES public.unidades_medida(id);


--
-- Name: ingredientes ingredientes_unidad_uso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredientes
    ADD CONSTRAINT ingredientes_unidad_uso_id_fkey FOREIGN KEY (unidad_uso_id) REFERENCES public.unidades_medida(id);


--
-- Name: inventario_mermas inventario_mermas_product_id_inventario_productos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_mermas
    ADD CONSTRAINT inventario_mermas_product_id_inventario_productos_id_fk FOREIGN KEY (product_id) REFERENCES public.inventario_productos(id);


--
-- Name: inventario_mermas inventario_mermas_reportado_por_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_mermas
    ADD CONSTRAINT inventario_mermas_reportado_por_id_users_id_fk FOREIGN KEY (reportado_por_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventario_ordenes inventario_ordenes_supplier_id_inventario_proveedores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_ordenes
    ADD CONSTRAINT inventario_ordenes_supplier_id_inventario_proveedores_id_fk FOREIGN KEY (supplier_id) REFERENCES public.inventario_proveedores(id);


--
-- Name: inventario_proveedor_producto inventario_proveedor_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedor_producto
    ADD CONSTRAINT inventario_proveedor_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.inventario_productos(id) ON DELETE CASCADE;


--
-- Name: inventario_proveedor_producto inventario_proveedor_producto_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_proveedor_producto
    ADD CONSTRAINT inventario_proveedor_producto_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.inventario_proveedores(id) ON DELETE CASCADE;


--
-- Name: logs_auditoria logs_auditoria_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: menus_del_dia_items menus_del_dia_items_menu_dia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia_items
    ADD CONSTRAINT menus_del_dia_items_menu_dia_id_fkey FOREIGN KEY (menu_dia_id) REFERENCES public.menus_del_dia(id) ON DELETE CASCADE;


--
-- Name: menus_del_dia_items menus_del_dia_items_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus_del_dia_items
    ADD CONSTRAINT menus_del_dia_items_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id);


--
-- Name: mesas mesas_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas_salon(id);


--
-- Name: metodos_pago_guardados metodos_pago_guardados_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago_guardados
    ADD CONSTRAINT metodos_pago_guardados_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: modificadores modificadores_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos_modificadores(id) ON DELETE CASCADE;


--
-- Name: nomina nomina_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina
    ADD CONSTRAINT nomina_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- Name: nomina_movimientos nomina_movimientos_autor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_movimientos
    ADD CONSTRAINT nomina_movimientos_autor_id_users_id_fk FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: nomina_movimientos nomina_movimientos_corrige_id_nomina_movimientos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_movimientos
    ADD CONSTRAINT nomina_movimientos_corrige_id_nomina_movimientos_id_fk FOREIGN KEY (corrige_id) REFERENCES public.nomina_movimientos(id);


--
-- Name: nomina_movimientos nomina_movimientos_empleado_id_empleados_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_movimientos
    ADD CONSTRAINT nomina_movimientos_empleado_id_empleados_id_fk FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- Name: orden_items orden_items_combo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combos(id);


--
-- Name: orden_items orden_items_estacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_estacion_id_fkey FOREIGN KEY (estacion_id) REFERENCES public.estaciones_cocina(id);


--
-- Name: orden_items orden_items_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE CASCADE;


--
-- Name: orden_items orden_items_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id);


--
-- Name: orden_items orden_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_platillo(id);


--
-- Name: ordenes ordenes_atendido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_atendido_por_fkey FOREIGN KEY (atendido_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ordenes ordenes_cancelado_por_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_cancelado_por_users_id_fk FOREIGN KEY (cancelado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ordenes ordenes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: ordenes ordenes_direccion_envio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_direccion_envio_id_fkey FOREIGN KEY (direccion_envio_id) REFERENCES public.direcciones_cliente(id) ON DELETE SET NULL;


--
-- Name: ordenes ordenes_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: ordenes ordenes_reservacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_reservacion_id_fkey FOREIGN KEY (reservacion_id) REFERENCES public.reservaciones(id);


--
-- Name: pagos pagos_cobrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_cobrado_por_fkey FOREIGN KEY (cobrado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pagos pagos_metodo_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_metodo_pago_id_fkey FOREIGN KEY (metodo_pago_id) REFERENCES public.metodos_pago(id);


--
-- Name: pagos pagos_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id);


--
-- Name: perfiles_facturacion perfiles_facturacion_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_facturacion
    ADD CONSTRAINT perfiles_facturacion_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: platillos_alergenos platillos_alergenos_alergeno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_alergenos
    ADD CONSTRAINT platillos_alergenos_alergeno_id_fkey FOREIGN KEY (alergeno_id) REFERENCES public.alergenos(id);


--
-- Name: platillos_alergenos platillos_alergenos_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_alergenos
    ADD CONSTRAINT platillos_alergenos_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id) ON DELETE CASCADE;


--
-- Name: platillos platillos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos
    ADD CONSTRAINT platillos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_menu(id);


--
-- Name: platillos_modificadores platillos_modificadores_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_modificadores
    ADD CONSTRAINT platillos_modificadores_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos_modificadores(id);


--
-- Name: platillos_modificadores platillos_modificadores_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos_modificadores
    ADD CONSTRAINT platillos_modificadores_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id) ON DELETE CASCADE;


--
-- Name: platillos platillos_subcategoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platillos
    ADD CONSTRAINT platillos_subcategoria_id_fkey FOREIGN KEY (subcategoria_id) REFERENCES public.subcategorias_menu(id);


--
-- Name: proveedores_ingredientes proveedores_ingredientes_ingrediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_ingredientes
    ADD CONSTRAINT proveedores_ingredientes_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id);


--
-- Name: proveedores_ingredientes proveedores_ingredientes_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_ingredientes
    ADD CONSTRAINT proveedores_ingredientes_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: proveedores_ingredientes proveedores_ingredientes_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores_ingredientes
    ADD CONSTRAINT proveedores_ingredientes_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidades_medida(id);


--
-- Name: puestos puestos_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT puestos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);


--
-- Name: recetas_ingredientes recetas_ingredientes_ingrediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes
    ADD CONSTRAINT recetas_ingredientes_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id);


--
-- Name: recetas_ingredientes recetas_ingredientes_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes
    ADD CONSTRAINT recetas_ingredientes_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE CASCADE;


--
-- Name: recetas_ingredientes recetas_ingredientes_unidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas_ingredientes
    ADD CONSTRAINT recetas_ingredientes_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidades_medida(id);


--
-- Name: recetas recetas_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id) ON DELETE CASCADE;


--
-- Name: recetas recetas_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_platillo(id);


--
-- Name: reembolsos reembolsos_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reembolsos
    ADD CONSTRAINT reembolsos_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reembolsos reembolsos_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reembolsos
    ADD CONSTRAINT reembolsos_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES public.pagos(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: registros_eliminados registros_eliminados_autor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_eliminados
    ADD CONSTRAINT registros_eliminados_autor_id_users_id_fk FOREIGN KEY (autor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: registros_eliminados registros_eliminados_restaurado_por_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_eliminados
    ADD CONSTRAINT registros_eliminados_restaurado_por_users_id_fk FOREIGN KEY (restaurado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reservaciones reservaciones_cancelado_por_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservaciones
    ADD CONSTRAINT reservaciones_cancelado_por_users_id_fk FOREIGN KEY (cancelado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reservaciones reservaciones_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservaciones
    ADD CONSTRAINT reservaciones_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id);


--
-- Name: reservaciones reservaciones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservaciones
    ADD CONSTRAINT reservaciones_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: solicitudes_factura solicitudes_factura_atendida_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_atendida_por_fkey FOREIGN KEY (atendida_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: solicitudes_factura solicitudes_factura_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;


--
-- Name: solicitudes_factura solicitudes_factura_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE CASCADE;


--
-- Name: solicitudes_factura solicitudes_factura_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_factura
    ADD CONSTRAINT solicitudes_factura_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subcategorias_menu subcategorias_menu_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategorias_menu
    ADD CONSTRAINT subcategorias_menu_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_menu(id) ON DELETE CASCADE;


--
-- Name: variantes_platillo variantes_platillo_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_platillo
    ADD CONSTRAINT variantes_platillo_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id) ON DELETE CASCADE;


--
-- Name: ventas ventas_platillo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id);


--
-- Name: consentimientos acceso_roles_backend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY acceso_roles_backend ON public.consentimientos TO operator_role, readonly_role, sgr_backend, sgr_cocina, sgr_migraciones, sgr_punto_venta, sgr_solo_lectura, admin_role USING (true) WITH CHECK (true);


--
-- Name: nomina_movimientos acceso_roles_backend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY acceso_roles_backend ON public.nomina_movimientos TO operator_role, readonly_role, sgr_backend, sgr_migraciones, sgr_solo_lectura, admin_role USING (true) WITH CHECK (true);


--
-- Name: refresh_tokens acceso_roles_backend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY acceso_roles_backend ON public.refresh_tokens TO operator_role, readonly_role, sgr_backend, sgr_cocina, sgr_migraciones, sgr_punto_venta, sgr_solo_lectura, admin_role USING (true) WITH CHECK (true);


--
-- Name: solicitudes_factura acceso_roles_backend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY acceso_roles_backend ON public.solicitudes_factura TO operator_role, readonly_role, sgr_backend, sgr_cocina, sgr_migraciones, sgr_punto_venta, sgr_solo_lectura, admin_role USING (true) WITH CHECK (true);


--
-- Name: consentimientos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: nomina_movimientos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nomina_movimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: solicitudes_factura; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.solicitudes_factura ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


