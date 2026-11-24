/**
 * Cartiva Mini — Admin Dashboard Routes
 * Mounted at /api/v1/admin/dashboard
 */
import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { UserRole } from '@shared/enums.js';

export const adminDashboardRouter = Router();

// Guarded by authentication and Admin/Staff role
adminDashboardRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminDashboardRouter.get(
  '/summary',
  asyncHandler((req, res) => dashboardController.getSummary(req, res))
);

adminDashboardRouter.get(
  '/charts',
  asyncHandler((req, res) => dashboardController.getCharts(req, res))
);
