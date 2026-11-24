/**
 * Cartiva Mini — Admin Financial Reporting Routes
 * Mounted at /api/v1/admin/reports
 */
import { Router } from 'express';
import { reportController } from './report.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { UserRole } from '@shared/enums.js';

export const adminReportRouter = Router();

// Guarded by authentication and Admin role (Staff cannot export bulk financial data without permission)
adminReportRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminReportRouter.get(
  '/sales',
  asyncHandler((req, res) => reportController.getSalesReport(req, res))
);

adminReportRouter.get(
  '/export/orders',
  asyncHandler((req, res) => reportController.exportOrdersCsv(req, res))
);

adminReportRouter.get(
  '/export/products',
  asyncHandler((req, res) => reportController.exportProductsCsv(req, res))
);
