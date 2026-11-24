import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { ICart } from '@shared/models.types.js';

export interface CartDocument extends Omit<ICart, '_id' | 'userId'>, Document {
  userId?: Types.ObjectId;
}

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
    },
    variantId: {
      type: Schema.Types.ObjectId,
    },
    sku: {
      type: String,
      required: [true, 'SKU snapshot is required.'],
    },
    title: {
      type: String,
      required: [true, 'Title snapshot is required.'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price snapshot is required.'],
      min: [0, 'Unit price cannot be negative.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
      default: 1,
    },
    thumbnailUrl: {
      type: String,
    },
  },
  { _id: true }
);

const cartSchema = new Schema<CartDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      unique: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // MongoDB TTL Index: documents automatically purged once expiresAt is reached
    },
  },
  {
    timestamps: true,
  }
);

// Validation: At least one of userId or sessionId must be set
cartSchema.pre('validate', function (next) {
  if (!this.userId && !this.sessionId) {
    next(
      new Error('Cart must be associated with either an authenticated user or a guest session ID.')
    );
  } else {
    next();
  }
});

// Auto-calculate subtotal using integer minor units before saving
cartSchema.pre('save', function (next) {
  const subtotalMinor = this.items.reduce(
    (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
    0
  );
  this.subtotal = subtotalMinor / 100;
  next();
});

export const Cart: Model<CartDocument> = model<CartDocument>('Cart', cartSchema);
