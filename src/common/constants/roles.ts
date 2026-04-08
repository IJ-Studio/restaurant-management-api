/**
 * common/constants/roles.ts
 *
 * Centralized role constants for backend
 * Must match frontend config/roles.config.ts
 */

export const ROLES = {
  ADMIN: 1,
  CAJERO: 2,
  MESERO: 3,
  COCINA: 4,
  CLIENTE: 5,
} as const;

export const ROLE_NAMES: Record<number, string> = {
  1: 'admin',
  2: 'cajero',
  3: 'mesero',
  4: 'cocina',
  5: 'cliente',
};

// Roles que el admin puede crear (excluye admin)
export const CREATABLE_ROLES = [2, 3, 4, 5] as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];
