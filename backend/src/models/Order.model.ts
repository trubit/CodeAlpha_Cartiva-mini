import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from '@shared/enums.js';
import type { IOrder } from '@shared/models.types.js';

export interface OrderDocument extends Omit<IOrder, '_id' | 'userId' | 'paymentId'>, Document {
  userId: Types.ObjectId;
  paymentId?: Types.ObjectId;
}

const addressSnapshotSchema = new Schema(
  {
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    apartmentSuite: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, default: 'Nigeria' },
  },
  { _id: false }
);

const orderItemSnapshotSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    unitPriceMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    subtotalMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    thumbnailUrl: {
      type: String,
    },
  },
  { _id: true }
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required.'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email snapshot is required.'],
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone snapshot is required.'],
      trim: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: [true, 'Order must contain at least one item.'],
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one purchased item.',
      },
    },
    shippingAddress: {
      type: addressSnapshotSchema,
      required: [true, 'Shipping address snapshot is required.'],
    },
    billingAddress: {
      type: addressSnapshotSchema,
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    subtotalMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    discountAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: [0, 'Shipping fee cannot be negative'],
    },
    shippingFeeMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    taxAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required.'],
      min: [0, 'Total amount cannot be negative'],
    },
    totalAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingMethodId: {
      type: String,
      trim: true,
    },
    shippingMethodName: {
      type: String,
      trim: true,
    },
    estimatedDeliveryText: {
      type: String,
      trim: true,
    },
    reservationReference: {
      type: String,
      trim: true,
      index: true,
    },
    checkoutSessionId: {
      type: String,
      trim: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING_PAYMENT,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    carrier: {
      type: String,
      trim: true,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1, createdAt: -1 });

export const Order: Model<OrderDocument> = model<OrderDocument>('Order', orderSchema);
