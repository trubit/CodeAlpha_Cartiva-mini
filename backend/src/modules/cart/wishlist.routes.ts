/**
 * Cartiva Mini — Customer Wishlist API Routes
 * Mounts endpoints for customer bookmarking, item removal, and transferring to shopping cart.
 */
import { Router } from 'express';
import { wishlistController } from './wishlist.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { standardRateLimiter } from '../../middleware/rate-limit.middleware.js';
import {
  addWishlistItemSchema,
  moveWishlistItemSchema,
  itemIdParamSchema,
} from './cart.validator.js';

export const wishlistRouter: Router = Router();

// Apply standard API rate limiter and enforce authentication on all wishlist endpoints
wishlistRouter.use(standardRateLimiter);
wishlistRouter.use(authenticate);

wishlistRouter.get('/', wishlistController.getWishlist);
wishlistRouter.post(
  '/items',
  validateRequest({ body: addWishlistItemSchema }),
  wishlistController.addItem
);
wishlistRouter.delete(
  '/items/:itemId',
  validateRequest({ params: itemIdParamSchema }),
  wishlistController.removeItem
);
wishlistRouter.post(
  '/items/:itemId/move-to-cart',
  validateRequest({ params: itemIdParamSchema, body: moveWishlistItemSchema }),
  wishlistController.moveToCart
);
