import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { IReconciliationRecord } from '@shared/models.types.js';

export interface ReconciliationRecordDocument
  extends Omit<IReconciliationRecord, '_id' | 'reconciledBy'>,
    Document {
  reconciledBy: Types.ObjectId;
}

const reconciliationRecordSchema = new Schema<ReconciliationRecordDocument>(
  {
    reconciliationId: {
      type: String,
      required: [true, 'Reconciliation identifier is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orderReference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    internalAmountMinor: {
      type: Number,
      required: true,
    },
    providerAmountMinor: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    internalStatus: {
      type: String,
      required: true,
    },
    providerStatus: {
      type: String,
      required: true,
    },
    matched: {
      type: Boolean,
      required: true,
      index: true,
    },
    discrepancies: {
      type: [String],
      default: [],
    },
    reconciledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reconciliationRecordSchema.index({ matched: 1, reconciledAt: -1 });

export const ReconciliationRecord: Model<ReconciliationRecordDocument> =
  model<ReconciliationRecordDocument>('ReconciliationRecord', reconciliationRecordSchema);
