/**
 * Cartiva Mini — Administrator Audit Log Routes
 * Mounted at /api/v1/admin/audit-logs
 */
import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { UserRole } from '@shared/enums.js';

export const adminAuditRouter = Router();

// Strictly guarded by Admin role (Staff cannot view compliance audit ledger)
adminAuditRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminAuditRouter.get(
  '/',
  asyncHandler((req, res) => auditController.listLogs(req, res))
);
