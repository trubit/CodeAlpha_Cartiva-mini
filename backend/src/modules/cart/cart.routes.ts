/**
 * Cartiva Mini — Shopping Cart API Routes
 * Mounts endpoints for shopping cart operations, guest session handling, and cart merging.
 */
import { Router } from 'express';
import { cartController } from './cart.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { standardRateLimiter } from '../../middleware/rate-limit.middleware.js';
import {
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
  itemIdParamSchema,
} from './cart.validator.js';

export const cartRouter: Router = Router();

// Apply standard API rate limiter
cartRouter.use(standardRateLimiter);

// Public/Guest & Authenticated Cart Management Endpoints
cartRouter.get('/', optionalAuthenticate, cartController.getCart);
cartRouter.post(
  '/items',
  optionalAuthenticate,
  validateRequest({ body: addItemSchema }),
  cartController.addItem
);
cartRouter.patch(
  '/items/:itemId',
  optionalAuthenticate,
  validateRequest({ params: itemIdParamSchema, body: updateQuantitySchema }),
  cartController.updateItemQuantity
);
cartRouter.delete(
  '/items/:itemId',
  optionalAuthenticate,
  validateRequest({ params: itemIdParamSchema }),
  cartController.removeItem
);
cartRouter.delete('/', optionalAuthenticate, cartController.clearCart);

// Authenticated Cart Merge Endpoint
cartRouter.post(
  '/merge',
  authenticate,
  validateRequest({ body: mergeCartSchema }),
  cartController.mergeCart
);
