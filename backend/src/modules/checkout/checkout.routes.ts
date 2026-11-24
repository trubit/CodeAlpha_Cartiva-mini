/**
 * Cartiva Mini — Checkout Routes
 * Exposes endpoints for session initialization, address/shipping selection, summary, and order confirmation.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { checkoutController } from './checkout.controller.js';

export const checkoutRouter = Router();

// All checkout endpoints require customer authentication
checkoutRouter.use(authenticate);

checkoutRouter.get('/session', checkoutController.getSession);
checkoutRouter.post('/session', checkoutController.getSession);
checkoutRouter.patch('/session/address', checkoutController.setAddress);
checkoutRouter.post('/session/address', checkoutController.setAddress);
checkoutRouter.patch('/session/shipping', checkoutController.setShipping);
checkoutRouter.post('/session/shipping', checkoutController.setShipping);
checkoutRouter.get('/session/summary', checkoutController.getSummary);
checkoutRouter.post('/validate', checkoutController.validateCheckout);
checkoutRouter.post('/confirm', checkoutController.confirmOrder);
