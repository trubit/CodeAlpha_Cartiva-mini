import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { IWishlist } from '@shared/models.types.js';

export interface WishlistDocument extends Omit<IWishlist, '_id' | 'userId'>, Document {
  userId: Types.ObjectId;
}

const wishlistItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const wishlistSchema = new Schema<WishlistDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ownership reference is required.'],
      unique: true,
      index: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate items in wishlist
wishlistSchema.pre('save', function (next) {
  const seenIds = new Set<string>();
  const deduplicatedItems = [];

  for (const item of this.items) {
    const idStr = item.productId.toString();
    if (!seenIds.has(idStr)) {
      seenIds.add(idStr);
      deduplicatedItems.push(item);
    }
  }

  this.items = deduplicatedItems as unknown as typeof this.items;
  next();
});

wishlistSchema.index({ 'items.productId': 1 });

export const Wishlist: Model<WishlistDocument> = model<WishlistDocument>(
  'Wishlist',
  wishlistSchema
);
