import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { ISession } from '@shared/models.types.js';

export interface SessionDocument extends Omit<ISession, '_id' | 'userId'>, Document {
  userId: Types.ObjectId;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for session creation.'],
      index: true,
    },
    sessionId: {
      type: String,
      required: [true, 'Session identifier is required.'],
      unique: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: [true, 'Hashed refresh token is required.'],
      unique: true,
      sparse: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: 'Unknown Device',
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: 'Unknown IP',
      maxlength: 100,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiration date is required.'],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge expired sessions from MongoDB
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound query index for fast active session lookup per user
sessionSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });

export const Session: Model<SessionDocument> = model<SessionDocument>('Session', sessionSchema);
