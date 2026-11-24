/**
 * Cartiva Mini — Administrator Fulfilment Routes
 * Mounted at /api/v1/admin/fulfilment and /api/v1/admin/shipments
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '@shared/enums.js';
import { adminFulfilmentController } from './admin-fulfilment.controller.js';

export const adminFulfilmentRouter = Router();

// Guarded by authentication and Admin/Staff role
adminFulfilmentRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

// Fulfilment Orders
adminFulfilmentRouter.get('/', adminFulfilmentController.listOrders);
adminFulfilmentRouter.get('/:orderId', adminFulfilmentController.getOrderDetail);
adminFulfilmentRouter.patch('/:orderId/status', adminFulfilmentController.updateStatus);
adminFulfilmentRouter.post('/:orderId/shipments', adminFulfilmentController.createShipment);

// Shipment Events & Confirmation Router
export const adminShipmentRouter = Router();
adminShipmentRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminShipmentRouter.patch('/:shipmentId', adminFulfilmentController.updateShipment);
adminShipmentRouter.post('/:shipmentId/events', adminFulfilmentController.addTrackingEvent);
adminShipmentRouter.post('/:shipmentId/delivery-confirmation', adminFulfilmentController.confirmDelivery);
adminShipmentRouter.post('/:shipmentId/exceptions', adminFulfilmentController.recordException);
