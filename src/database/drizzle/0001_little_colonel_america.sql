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
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_key";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_name_unique" UNIQUE("name");