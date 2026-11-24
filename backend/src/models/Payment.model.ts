import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { PaymentStatus } from '@shared/enums.js';
import type { IPayment } from '@shared/models.types.js';

export interface PaymentDocument extends Omit<IPayment, '_id' | 'orderId' | 'userId'>, Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
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
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required.'],
      min: [0.01, 'Payment amount must be greater than zero.'],
    },
    amountMinor: {
      type: Number,
      required: [true, 'Payment amount in minor unit is required.'],
      default: function (this: PaymentDocument) {
        return this.amount ? Math.round(this.amount * 100) : 0;
      },
      min: [1, 'Payment amount minor must be at least 1.'],
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    gateway: {
      type: String,
      default: 'paystack',
      lowercase: true,
      trim: true,
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
      sparse: true,
    },
    authorizationUrl: {
      type: String,
      trim: true,
    },
    accessCode: {
      type: String,
      trim: true,
    },
    channel: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.INITIALIZED,
      index: true,
    },
    refundedAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment: Model<PaymentDocument> = model<PaymentDocument>('Payment', paymentSchema);
