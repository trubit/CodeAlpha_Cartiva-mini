/**
 * Cartiva Mini — Administrator Order Routes
 * Mounted at /api/v1/admin/orders
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '@shared/enums.js';
import { adminOrderController } from './admin-order.controller.js';

export const adminOrderRouter = Router();

// Guarded by authentication and Admin role
adminOrderRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminOrderRouter.get('/', adminOrderController.listOrders);
adminOrderRouter.get('/:orderId', adminOrderController.getOrderDetail);
adminOrderRouter.patch('/:orderId/status', adminOrderController.updateStatus);
adminOrderRouter.get('/:orderId/audit', adminOrderController.getOrderAudit);
