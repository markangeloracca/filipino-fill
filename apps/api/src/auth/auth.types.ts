import type { Request } from 'express';
import type { UserRole } from '../database/database.types.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  emailVerified: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const ADMIN_ROLES: readonly UserRole[] = ['admin', 'super_admin'];
