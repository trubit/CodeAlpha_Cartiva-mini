/**
 * Cartiva Mini — Administrator Review Moderation Routes
 * Mounted at /api/v1/admin/reviews
 */
import { Router } from 'express';
import { reviewController } from './review.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { updateReviewStatusSchema } from './review.validator.js';
import { UserRole } from '@shared/enums.js';

export const adminReviewRouter = Router();

// Enforce authentication & Administrator/Staff permissions
adminReviewRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminReviewRouter.get(
  '/',
  asyncHandler((req, res) => reviewController.listReviews(req, res))
);

adminReviewRouter.patch(
  '/:reviewId/status',
  validateRequest({ body: updateReviewStatusSchema }),
  asyncHandler((req, res) => reviewController.updateStatus(req, res))
);

adminReviewRouter.delete(
  '/:reviewId',
  asyncHandler((req, res) => reviewController.deleteReview(req, res))
);
