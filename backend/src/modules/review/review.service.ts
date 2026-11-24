/**
 * Cartiva Mini — Product Review & Moderation Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { Types } from 'mongoose';
import { Review, Product, AuditLog, type ReviewDocument } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import { ReviewStatus } from '@shared/enums.js';
import type {
  ReviewDto,
  CreateReviewDto,
  ReviewFilterDto,
  PaginatedReviewsDto,
} from '@shared/api.types.js';

interface PopulatedReview extends Omit<ReviewDocument, 'productId' | 'userId'> {
  productId: { _id: Types.ObjectId; title: string; sku: string };
  userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string };
}

export class ReviewService {
  private mapToDto(review: ReviewDocument | PopulatedReview): ReviewDto {
    const isPopulatedProduct =
      typeof review.productId === 'object' && review.productId !== null && 'title' in review.productId;
    const isPopulatedUser =
      typeof review.userId === 'object' && review.userId !== null && 'firstName' in review.userId;

    const productIdStr = isPopulatedProduct
      ? (review.productId as { _id: Types.ObjectId })._id.toString()
      : review.productId.toString();

    const productTitle = isPopulatedProduct
      ? (review.productId as { title: string }).title
      : undefined;

    const userIdStr = isPopulatedUser
      ? (review.userId as { _id: Types.ObjectId })._id.toString()
      : review.userId.toString();

    const customerName = isPopulatedUser
      ? `${(review.userId as { firstName: string }).firstName} ${(review.userId as { lastName: string }).lastName}`
      : undefined;

    const customerEmail = isPopulatedUser
      ? (review.userId as { email: string }).email
      : undefined;

    return {
      id: review._id.toString(),
      productId: productIdStr,
      productTitle,
      userId: userIdStr,
      customerName,
      customerEmail,
      orderId: review.orderId ? review.orderId.toString() : '',
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images,
      isVerifiedBuyer: review.isVerifiedBuyer,
      status: review.status as ReviewStatus,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  /**
   * Recalculates and updates product rating and reviewCount for approved reviews.
   */
  private async recalculateProductRating(productId: Types.ObjectId): Promise<void> {
    const agg = await Review.aggregate<{ _id: null; avgRating: number; count: number }>([
      {
        $match: {
          productId,
          status: ReviewStatus.APPROVED,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgRating = agg[0]?.avgRating ? Math.round(agg[0].avgRating * 10) / 10 : 0;
    const reviewCount = agg[0]?.count || 0;

    await Product.findByIdAndUpdate(productId, {
      averageRating: avgRating,
      reviewCount,
    });
  }

  public async listReviews(query: ReviewFilterDto): Promise<PaginatedReviewsDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.productId) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.rating) {
      filter.rating = query.rating;
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search.trim(), $options: 'i' } },
        { comment: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate<{ productId: { _id: Types.ObjectId; title: string; sku: string } }>(
          'productId',
          'title sku'
        )
        .populate<{ userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
          'userId',
          'firstName lastName email'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reviews: reviews.map((r) => this.mapToDto(r as unknown as PopulatedReview)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getProductPublicReviews(productId: string): Promise<ReviewDto[]> {
    const reviews = await Review.find({
      productId: new Types.ObjectId(productId),
      status: ReviewStatus.APPROVED,
    })
      .populate<{ userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
        'userId',
        'firstName lastName'
      )
      .sort({ createdAt: -1 })
      .limit(50);

    return reviews.map((r) => this.mapToDto(r as unknown as PopulatedReview));
  }

  public async createReview(
    productId: string,
    userId: string,
    dto: CreateReviewDto
  ): Promise<ReviewDto> {
    const pId = new Types.ObjectId(productId);
    const uId = new Types.ObjectId(userId);

    const product = await Product.findById(pId);
    if (!product) {
      throw new AppError('Product not found.', HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');
    }

    const existing = await Review.findOne({ productId: pId, userId: uId });
    if (existing) {
      throw new AppError(
        'You have already submitted a review for this product.',
        HttpStatus.CONFLICT,
        'REVIEW_ALREADY_EXISTS'
      );
    }

    const review = await Review.create({
      productId: pId,
      userId: uId,
      orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : new Types.ObjectId(),
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      images: dto.images || [],
      isVerifiedBuyer: true,
      status: ReviewStatus.APPROVED, // Automatically approved or staged for moderation
    });

    await this.recalculateProductRating(pId);

    return this.mapToDto(review);
  }

  public async updateReviewStatus(
    reviewId: string,
    status: ReviewStatus,
    moderationReason?: string,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ReviewDto> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found.', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND');
    }

    const prevStatus = review.status;
    review.status = status;
    await review.save();

    await this.recalculateProductRating(review.productId);

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'REVIEW_STATUS_MODERATED',
        entity: 'Review',
        entityId: review._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: {
          before: { status: prevStatus },
          after: { status, moderationReason },
        },
      });
    }

    return this.mapToDto(review);
  }

  public async deleteReview(
    reviewId: string,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found.', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND');
    }

    const deletedState = review.toObject();
    const productId = review.productId;

    await Review.findByIdAndDelete(reviewId);
    await this.recalculateProductRating(productId);

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'REVIEW_DELETED',
        entity: 'Review',
        entityId: reviewId,
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { before: deletedState },
      });
    }
  }
}

export const reviewService = new ReviewService();
