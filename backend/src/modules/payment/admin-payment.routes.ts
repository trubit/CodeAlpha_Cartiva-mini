/**
 * Cartiva Mini — Administrator Payment Routes
 * RBAC-protected administrative payment, refund, and reconciliation routes.
 */
import { Router } from 'express';
import { adminPaymentController } from './admin-payment.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '@shared/enums.js';

export const adminPaymentRouter = Router();

// Enforce authentication and ADMIN role for all routes in this router
adminPaymentRouter.use(authenticate, requireRole(UserRole.ADMIN));

// List all transactions with search, date, and status filters
adminPaymentRouter.get('/', adminPaymentController.listPayments);

// Financial reconciliation
adminPaymentRouter.get('/reconciliation', adminPaymentController.runReconciliation);

// List all refund records
adminPaymentRouter.get('/refunds', adminPaymentController.listRefunds);

// View specific refund record
adminPaymentRouter.get('/refunds/:refundId', adminPaymentController.getRefundDetails);

// View single payment details
adminPaymentRouter.get('/:reference', adminPaymentController.getPaymentDetails);

// Issue refund for a payment
adminPaymentRouter.post('/:paymentId/refunds', adminPaymentController.createRefund);
