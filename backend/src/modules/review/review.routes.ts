/**
 * Cartiva Mini — Public & Customer Review Routes
 * Mounted at /api/v1/reviews
 */
import { Router } from 'express';
import { reviewController } from './review.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { createReviewSchema } from './review.validator.js';

export const reviewRouter = Router();

// Public: Fetch approved reviews for a specific product
reviewRouter.get(
  '/products/:productId',
  asyncHandler((req, res) => reviewController.getProductReviews(req, res))
);

// Authenticated Customer: Post a verified review for a product
reviewRouter.post(
  '/products/:productId',
  authenticate,
  validateRequest({ body: createReviewSchema }),
  asyncHandler((req, res) => reviewController.createReview(req, res))
);
