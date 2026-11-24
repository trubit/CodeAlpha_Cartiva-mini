/**
 * Cartiva Mini — Customer Fulfilment & Tracking Routes
 * Endpoints for tracking customer orders.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { customerFulfilmentController } from './customer-fulfilment.controller.js';

export const customerFulfilmentRouter = Router({ mergeParams: true });

// Require authentication for customer tracking
customerFulfilmentRouter.use(authenticate);

customerFulfilmentRouter.get('/fulfilment', customerFulfilmentController.getOrderFulfilment);
customerFulfilmentRouter.get('/tracking', customerFulfilmentController.getOrderTracking);
