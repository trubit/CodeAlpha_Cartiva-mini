/**
 * Cartiva Mini — Customer Payment Routes
 * Customer-facing payment lifecycle endpoints.
 */
import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware.js';

export const paymentRouter = Router();

// Customer initiates payment session
paymentRouter.post('/initialize', authenticate, paymentController.initializePayment);

// Payment status verification with provider
paymentRouter.get('/:reference/verify', optionalAuthenticate, paymentController.verifyPayment);

// Customer lists own payments
paymentRouter.get('/', authenticate, paymentController.listMyPayments);

// Customer views single payment detail
paymentRouter.get('/:reference', authenticate, paymentController.getPayment);

// Customer retries failed payment attempt
paymentRouter.post('/:reference/retry', authenticate, paymentController.retryPayment);
