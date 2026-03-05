-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
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

*/