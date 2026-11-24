/**
 * Cartiva Mini — Review Controller
 * Handles customer review submissions and administrative moderation endpoints.
 */
import type { Request, Response } from 'express';
import { reviewService } from './review.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import type { ReviewStatus } from '@shared/enums.js';

class ReviewController {
  // Public product reviews
  public async getProductReviews(req: Request, res: Response): Promise<void> {
    const { productId } = req.params;
    const reviews = await reviewService.getProductPublicReviews(productId!);
    sendSuccess(res, reviews, 'Product reviews retrieved successfully.');
  }

  // Customer submit review
  public async createReview(req: Request, res: Response): Promise<void> {
    const { productId } = req.params;
    const userId = req.user!.userId;
    const review = await reviewService.createReview(productId!, userId, req.body);
    sendSuccess(res, review, 'Review submitted successfully.', HttpStatus.CREATED);
  }

  // Admin list all reviews
  public async listReviews(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as ReviewStatus | undefined;
    const productId = req.query.productId as string | undefined;
    const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
    const search = req.query.search as string | undefined;

    const result = await reviewService.listReviews({
      page,
      limit,
      status,
      productId,
      rating,
      search,
    });

    sendSuccess(res, result, 'Reviews retrieved successfully.');
  }

  // Admin moderate status
  public async updateStatus(req: Request, res: Response): Promise<void> {
    const { reviewId } = req.params;
    const adminId = req.user?.userId;
    const { status, moderationReason } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const review = await reviewService.updateReviewStatus(
      reviewId!,
      status,
      moderationReason,
      adminId,
      context
    );

    sendSuccess(res, review, 'Review moderation status updated successfully.');
  }

  // Admin delete review
  public async deleteReview(req: Request, res: Response): Promise<void> {
    const { reviewId } = req.params;
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    await reviewService.deleteReview(reviewId!, adminId, context);
    sendSuccess(res, null, 'Review deleted successfully.');
  }
}

export const reviewController = new ReviewController();
