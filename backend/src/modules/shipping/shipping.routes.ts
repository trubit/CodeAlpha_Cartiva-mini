import { Router } from 'express';
import { shippingController } from './shipping.controller.js';
import { optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { standardRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { shippingAvailabilityQuerySchema, shippingQuoteSchema } from './shipping.validator.js';

export const shippingRouter = Router();

// Apply standard API rate limiter
shippingRouter.use(standardRateLimiter);

/**
 * GET /api/v1/shipping/methods
 * Retrieves available shipping methods for a destination country and state.
 */
shippingRouter.get(
  '/methods',
  validateRequest({ query: shippingAvailabilityQuerySchema }),
  asyncHandler((req, res) => shippingController.getAvailableMethods(req, res))
);

/**
 * GET /api/v1/shipping/availability
 * Checks whether delivery service is available to a destination location.
 */
shippingRouter.get(
  '/availability',
  validateRequest({ query: shippingAvailabilityQuerySchema }),
  asyncHandler((req, res) => shippingController.checkAvailability(req, res))
);

/**
 * POST /api/v1/shipping/quotes
 * Calculates authoritative shipping quotes based on cart contents and delivery address.
 */
shippingRouter.post(
  '/quotes',
  optionalAuthenticate,
  validateRequest({ body: shippingQuoteSchema }),
  asyncHandler((req, res) => shippingController.calculateQuote(req, res))
);
