import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { INotificationPreference } from '@shared/models.types.js';

export interface NotificationPreferenceDocument
  extends Omit<INotificationPreference, '_id' | 'userId'>,
    Document {
  userId: Types.ObjectId;
}

const notificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      unique: true,
      index: true,
    },
    // Essential transactional communications (Mandatory: platform policy preserves these true)
    orderUpdates: {
      type: Boolean,
      default: true,
      required: true,
    },
    securityAlerts: {
      type: Boolean,
      default: true,
      required: true,
    },
    // Optional marketing communications
    promotionalEmails: {
      type: Boolean,
      default: false,
      required: true,
    },
    newsletter: {
      type: Boolean,
      default: false,
      required: true,
    },
    inAppAlerts: {
      type: Boolean,
      default: true,
      required: true,
    },
    smsAlerts: {
      type: Boolean,
      default: false,
      required: true,
    },
    pushAlerts: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationPreference: Model<NotificationPreferenceDocument> =
  model<NotificationPreferenceDocument>('NotificationPreference', notificationPreferenceSchema);
