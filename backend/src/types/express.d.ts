import type { AuthenticatedUser } from '../modules/auth/auth.types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
      tenantId?: string;
      tenant?: unknown;
    }
  }
}

export {};
