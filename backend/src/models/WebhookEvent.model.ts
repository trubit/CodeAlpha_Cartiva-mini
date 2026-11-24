import { Schema, model, type Document, type Model } from 'mongoose';
import type { IWebhookEvent } from '@shared/models.types.js';

export interface WebhookEventDocument extends Omit<IWebhookEvent, '_id'>, Document {}

const webhookEventSchema = new Schema<WebhookEventDocument>(
  {
    eventId: {
      type: String,
      required: [true, 'Event ID is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    event: {
      type: String,
      required: [true, 'Event type is required.'],
      trim: true,
      index: true,
    },
    gateway: {
      type: String,
      default: 'paystack',
      lowercase: true,
      trim: true,
    },
    reference: {
      type: String,
      required: [true, 'Transaction reference is required.'],
      trim: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    error: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

webhookEventSchema.index({ gateway: 1, reference: 1 });
webhookEventSchema.index({ createdAt: -1 });

export const WebhookEvent: Model<WebhookEventDocument> = model<WebhookEventDocument>(
  'WebhookEvent',
  webhookEventSchema
);
