import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { NotificationType } from '@shared/enums.js';
import type { INotification } from '@shared/models.types.js';

export interface NotificationDocument extends Omit<INotification, '_id' | 'recipientId'>, Document {
  recipientId: Types.ObjectId;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required.'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required.'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters.'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters.'],
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 90 * 24 * 60 * 60, // 90 days TTL auto-expiration
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<NotificationDocument> = model<NotificationDocument>(
  'Notification',
  notificationSchema
);
