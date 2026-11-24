import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { DiscountType } from '@shared/enums.js';
import type { ICoupon } from '@shared/models.types.js';

export interface CouponDocument
  extends Omit<ICoupon, '_id' | 'applicableCategories' | 'applicableProducts'>, Document {
  applicableCategories: Types.ObjectId[];
  applicableProducts: Types.ObjectId[];
}

const couponSchema = new Schema<CouponDocument>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Coupon code must be at least 3 characters.'],
      maxlength: [30, 'Coupon code cannot exceed 30 characters.'],
      match: [
        /^[A-Z0-9_-]+$/,
        'Coupon code can only contain uppercase letters, numbers, and dashes.',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters.'],
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: [true, 'Discount type is required.'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required.'],
      min: [0.01, 'Discount value must be greater than zero.'],
      validate: {
        validator: function (this: CouponDocument, value: number): boolean {
          if (this.discountType === DiscountType.PERCENTAGE) {
            return value <= 100;
          }
          return true;
        },
        message: 'Percentage discount cannot exceed 100%.',
      },
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative.'],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'Maximum discount amount cannot be negative.'],
    },
    startDate: {
      type: Date,
      required: [true, 'Coupon activation start date is required.'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Coupon expiry date is required.'],
      validate: {
        validator: function (this: CouponDocument, value: Date): boolean {
          return value > this.startDate;
        },
        message: 'Expiry date must be strictly after the start date.',
      },
    },
    usageLimitTotal: {
      type: Number,
      min: [1, 'Usage limit must be at least 1.'],
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Per-user limit must be at least 1.'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
couponSchema.index({ isActive: 1, startDate: 1, expiryDate: 1 });

export const Coupon: Model<CouponDocument> = model<CouponDocument>('Coupon', couponSchema);
