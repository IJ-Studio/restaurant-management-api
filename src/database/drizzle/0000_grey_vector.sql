CREATE TABLE "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"type" varchar(10) DEFAULT 'manual' NOT NULL,
	"status" varchar(10) DEFAULT 'ok' NOT NULL,
	"error_message" text,
	"tables" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"lastname" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password" text NOT NULL,
	"role_id" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"login_lock_until" bigint DEFAULT 0 NOT NULL,
	"recovery_attempts" integer DEFAULT 0 NOT NULL,
	"recovery_lock_until" bigint DEFAULT 0 NOT NULL,
	"session_time" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;