import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { IAuditLog } from '@shared/models.types.js';

export interface AuditLogDocument extends Omit<IAuditLog, '_id' | 'actorId'>, Document {
  actorId?: Types.ObjectId;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorRole: {
      type: String,
      default: 'system',
    },
    action: {
      type: String,
      required: [true, 'Audit action is required.'],
      trim: true,
      index: true,
    },
    entity: {
      type: String,
      required: [true, 'Entity type is required.'],
      trim: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity identifier is required.'],
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    changesDiff: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Immutable audit ledger
  }
);

auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

export const AuditLog: Model<AuditLogDocument> = model<AuditLogDocument>(
  'AuditLog',
  auditLogSchema
);
