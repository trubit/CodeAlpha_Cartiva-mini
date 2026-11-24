import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { CheckoutStep } from '@shared/enums.js';
import type { ICheckoutSession } from '@shared/models.types.js';

export interface CheckoutSessionDocument
  extends
    Omit<
      ICheckoutSession,
      '_id' | 'userId' | 'cartId' | 'shippingAddressId' | 'shippingMethodId' | 'orderId'
    >,
    Document {
  userId: Types.ObjectId;
  cartId: Types.ObjectId;
  shippingAddressId?: Types.ObjectId;
  shippingMethodId?: Types.ObjectId;
  orderId?: Types.ObjectId;
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

const shippingMethodSnapshotSchema = new Schema(
  {
    methodId: { type: String, required: true },
    methodName: { type: String, required: true },
    carrierName: { type: String },
    fee: { type: Number, required: true },
    feeMinor: { type: Number, required: true },
    currency: { type: String, required: true, default: 'NGN' },
    estimatedDeliveryText: { type: String, required: true },
    isFreeShipping: { type: Boolean, default: false },
  },
  { _id: false }
);

const checkoutSessionSchema = new Schema<CheckoutSessionDocument>(
  {
    sessionId: {
      type: String,
      required: [true, 'Checkout session ID is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    cartId: {
      type: Schema.Types.ObjectId,
      ref: 'Cart',
      required: [true, 'Cart reference is required.'],
      index: true,
    },
    shippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
    },
    shippingAddressSnapshot: {
      type: addressSnapshotSchema,
    },
    shippingMethodId: {
      type: Schema.Types.ObjectId,
      ref: 'ShippingConfiguration',
    },
    shippingMethodSnapshot: {
      type: shippingMethodSnapshotSchema,
    },
    step: {
      type: String,
      enum: Object.values(CheckoutStep),
      default: CheckoutStep.ADDRESS,
      index: true,
    },
    subtotalMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingFeeMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountAmountMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxAmountMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmountMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'NGN',
      uppercase: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
  },
  {
    timestamps: true,
  }
);

checkoutSessionSchema.index({ userId: 1, step: 1, createdAt: -1 });

export const CheckoutSession: Model<CheckoutSessionDocument> = model<CheckoutSessionDocument>(
  'CheckoutSession',
  checkoutSessionSchema
);
