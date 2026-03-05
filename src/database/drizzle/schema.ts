import { pgTable, unique, serial, varchar, jsonb, boolean, timestamp, text, integer, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	permissions: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_name_key").on(table.name),
]);

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
