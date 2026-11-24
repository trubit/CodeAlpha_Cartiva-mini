/**
 * Cartiva Mini — Customer Order Routes
 * Mounted at /api/v1/orders
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { orderController } from './order.controller.js';

import { customerFulfilmentController } from '../fulfilment/customer-fulfilment.controller.js';

export const orderRouter = Router();

// All customer order endpoints require authentication
orderRouter.use(authenticate);

orderRouter.get('/', orderController.getMyOrders);
orderRouter.get('/:orderId', orderController.getOrderDetail);
orderRouter.post('/:orderId/cancel', orderController.cancelOrder);
orderRouter.get('/:orderId/fulfilment', customerFulfilmentController.getOrderFulfilment);
orderRouter.get('/:orderId/tracking', customerFulfilmentController.getOrderTracking);

