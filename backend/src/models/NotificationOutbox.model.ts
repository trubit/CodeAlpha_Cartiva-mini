import { Schema, model, type Document, type Model, Types } from 'mongoose';
import {
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
} from '@shared/enums.js';
import type { INotificationOutbox } from '@shared/models.types.js';

export interface NotificationOutboxDocument
  extends Omit<INotificationOutbox, '_id' | 'recipientId'>,
    Document {
  recipientId?: Types.ObjectId;
}

const notificationOutboxSchema = new Schema<NotificationOutboxDocument>(
  {
    eventId: {
      type: String,
      required: [true, 'Event ID is required for idempotency.'],
      index: true,
    },
    eventType: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Event type is required.'],
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: [true, 'Notification channel is required.'],
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },
    content: {
      subject: { type: String, trim: true },
      body: { type: String, required: true },
      html: { type: String },
      actionUrl: { type: String },
      templateId: { type: String },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    status: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      default: NotificationDeliveryStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lastAttemptAt: {
      type: Date,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    lockedAt: {
      type: Date,
      index: true,
    },
    lockedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Idempotency constraint: Prevent duplicate processing for same event and channel
notificationOutboxSchema.index({ eventId: 1, channel: 1 }, { unique: true });

// Outbox worker query optimization index: pending or retrying items ready to be picked up
notificationOutboxSchema.index({ status: 1, nextRetryAt: 1, lockedAt: 1 });

export const NotificationOutbox: Model<NotificationOutboxDocument> =
  model<NotificationOutboxDocument>('NotificationOutbox', notificationOutboxSchema);
