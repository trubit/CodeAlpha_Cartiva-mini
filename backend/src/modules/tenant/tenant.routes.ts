import { Router } from 'express';
import { TenantService } from './tenant.service.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '@shared/enums.js';

export const tenantRouter = Router();

// GET /api/v1/tenants/current - Retrieve active tenant context
tenantRouter.get('/current', async (req, res) => {
  const tenantId = req.tenantId || 'default-cartiva';
  const tenant = await TenantService.getTenantById(tenantId);
  res.json({
    success: true,
    data: tenant || {
      tenantId,
      name: 'Cartiva Central Platform',
      status: 'active',
      type: 'platform',
    },
  });
});

// POST /api/v1/tenants - Register new company/tenant (Platform Admin only)
tenantRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const { tenantId, name, slug, type, settings } = req.body;
      if (!tenantId || !name || !slug) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'tenantId, name, and slug are required fields.',
          },
        });
        return;
      }

      const tenant = await TenantService.createTenant({
        tenantId,
        name,
        slug,
        type,
        settings,
      });

      res.status(201).json({
        success: true,
        message: 'Tenant partition created successfully.',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }
);
