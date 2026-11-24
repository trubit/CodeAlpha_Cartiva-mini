import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { ReviewStatus } from '@shared/enums.js';
import type { IReview } from '@shared/models.types.js';

export interface ReviewDocument
  extends Omit<IReview, '_id' | 'productId' | 'userId' | 'orderId'>, Document {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required for verified buyer validation.'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: [1, 'Rating must be at least 1 star.'],
      max: [5, 'Rating cannot exceed 5 stars.'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole integer between 1 and 5.',
      },
    },
    title: {
      type: String,
      required: [true, 'Review title is required.'],
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters.'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required.'],
      trim: true,
      maxlength: [1500, 'Review comment cannot exceed 1500 characters.'],
    },
    images: {
      type: [String],
      default: [],
    },
    isVerifiedBuyer: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.APPROVED,
      index: true,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One review per customer per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, rating: -1 });

export const Review: Model<ReviewDocument> = model<ReviewDocument>('Review', reviewSchema);
