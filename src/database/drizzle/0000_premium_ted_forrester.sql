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
