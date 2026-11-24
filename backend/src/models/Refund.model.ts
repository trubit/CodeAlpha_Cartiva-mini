import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { RefundStatus } from '@shared/enums.js';
import type { IRefund } from '@shared/models.types.js';

export interface RefundDocument
  extends Omit<IRefund, '_id' | 'paymentId' | 'orderId' | 'userId' | 'initiatedBy'>,
    Document {
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  initiatedBy: Types.ObjectId;
}

const refundSchema = new Schema<RefundDocument>(
  {
    refundReference: {
      type: String,
      required: [true, 'Refund reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required.'],
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required.'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Administrator initiator is required.'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required.'],
      min: [0.01, 'Refund amount must be greater than zero.'],
    },
    amountMinor: {
      type: Number,
      required: [true, 'Refund amount minor is required.'],
      min: [1, 'Refund amount minor must be at least 1.'],
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required.'],
      trim: true,
    },
    customerNote: {
      type: String,
      trim: true,
    },
    merchantNote: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      index: true,
    },
    gateway: {
      type: String,
      default: 'paystack',
      lowercase: true,
      trim: true,
    },
    gatewayRefundId: {
      type: String,
      trim: true,
      sparse: true,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

refundSchema.index({ paymentId: 1, createdAt: -1 });
refundSchema.index({ orderId: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });

export const Refund: Model<RefundDocument> = model<RefundDocument>('Refund', refundSchema);
