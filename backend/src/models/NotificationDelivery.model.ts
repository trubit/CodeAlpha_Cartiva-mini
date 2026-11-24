import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { NotificationChannel, NotificationDeliveryStatus } from '@shared/enums.js';
import type { INotificationDelivery } from '@shared/models.types.js';

export interface NotificationDeliveryDocument
  extends Omit<INotificationDelivery, '_id' | 'outboxId'>,
    Document {
  outboxId: Types.ObjectId;
}

const notificationDeliverySchema = new Schema<NotificationDeliveryDocument>(
  {
    outboxId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationOutbox',
      required: [true, 'Outbox reference is required.'],
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: [true, 'Notification channel is required.'],
    },
    provider: {
      type: String,
      required: [true, 'Provider identifier is required.'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      required: [true, 'Delivery status is required.'],
    },
    recipient: {
      type: String,
      required: [true, 'Recipient identifier is required.'],
      trim: true,
    },
    providerResponse: {
      type: Schema.Types.Mixed,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    error: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 180 * 24 * 60 * 60, // 180 days TTL retention
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationDeliverySchema.index({ outboxId: 1, attemptNumber: 1 });
notificationDeliverySchema.index({ recipient: 1, createdAt: -1 });

export const NotificationDelivery: Model<NotificationDeliveryDocument> =
  model<NotificationDeliveryDocument>('NotificationDelivery', notificationDeliverySchema);
