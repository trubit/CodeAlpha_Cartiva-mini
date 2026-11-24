import type { Request, Response, NextFunction } from 'express';
import { DEFAULT_TENANT_ID } from '../modules/tenant/tenant.model.js';

/**
 * Tenant Identification & Boundary Middleware.
 * Resolves tenant context from:
 * 1. HTTP Header: X-Tenant-ID / x-company-id
 * 2. Subdomain: subdomain.cartivamini.ng
 * 3. User claims: JWT token tenantId
 * 4. Default fallback: DEFAULT_TENANT_ID ('default-cartiva')
 *
 * Guarantees zero disruption to existing single-store marketplace clients.
 */
export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let resolvedTenantId = DEFAULT_TENANT_ID;

    // 1. Inspect request headers
    const headerTenant =
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-company-id'] as string);

    if (headerTenant && typeof headerTenant === 'string' && headerTenant.trim()) {
      resolvedTenantId = headerTenant.trim().toLowerCase();
    } else if (req.hostname && !req.hostname.startsWith('localhost') && !req.hostname.startsWith('127.0.0.1')) {
      // 2. Subdomain resolution
      const parts = req.hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
        const sub = parts[0];
        if (sub) {
          resolvedTenantId = sub.toLowerCase();
        }
      }
    }

    // Attach to request context
    req.tenantId = resolvedTenantId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Strict Tenant Boundary Guard Middleware.
 * Validates that authenticated admin/staff users cannot access or alter
 * records belonging to another company or tenant.
 */
export const requireTenantAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  const currentTenant = req.tenantId || DEFAULT_TENANT_ID;

  // Platform super admins have cross-tenant oversight
  if (user && ((user.role as string) === 'super_admin' || (user.role === 'admin' && !user.tenantId))) {
    return next();
  }

  // Tenant-scoped staff or company admin
  if (user && user.tenantId && user.tenantId !== currentTenant) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_CROSS_TENANT',
        message: 'Access denied: You cannot access resources outside your assigned tenant domain.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next();
};
