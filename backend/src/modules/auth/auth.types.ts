import type { UserRole } from '@shared/enums.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  jti?: string;
}

export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  tokenVersion: number;
  tenantId?: string;
}
