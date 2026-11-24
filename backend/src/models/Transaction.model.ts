import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { TransactionType } from '@shared/enums.js';
import type { ITransaction } from '@shared/models.types.js';

export interface TransactionDocument
  extends Omit<ITransaction, '_id' | 'paymentId' | 'orderId' | 'userId'>, Document {
  paymentId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  userId?: Types.ObjectId;
}

const transactionSchema = new Schema<TransactionDocument>(
  {
    transactionReference: {
      type: String,
      required: [true, 'Transaction reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required.'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required.'],
      min: [0.01, 'Amount must be greater than zero.'],
    },
    amountMinor: {
      type: Number,
      required: [true, 'Transaction amount in minor unit is required.'],
      default: function (this: TransactionDocument) {
        return this.amount ? Math.round(this.amount * 100) : 0;
      },
      min: [1, 'Amount minor must be at least 1.'],
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    gatewayFee: {
      type: Number,
      default: 0,
      min: [0, 'Gateway fee cannot be negative.'],
    },
    gatewayFeeMinor: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
    },
    netAmountMinor: {
      type: Number,
    },
    balanceBefore: {
      type: Number,
    },
    balanceAfter: {
      type: Number,
    },
    status: {
      type: String,
      default: 'successful',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Transaction records are immutable financial ledger entries
  }
);

// Calculate net amount before saving
transactionSchema.pre('save', function (next) {
  if (this.amount !== undefined && this.gatewayFee !== undefined) {
    this.netAmount = Math.round((this.amount - this.gatewayFee) * 100) / 100;
  }
  if (this.amountMinor !== undefined && this.gatewayFeeMinor !== undefined) {
    this.netAmountMinor = this.amountMinor - this.gatewayFeeMinor;
  }
  next();
});

transactionSchema.index({ type: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, timestamp: -1 });

export const Transaction: Model<TransactionDocument> = model<TransactionDocument>(
  'Transaction',
  transactionSchema
);
