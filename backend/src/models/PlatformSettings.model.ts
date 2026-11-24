import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { IPlatformSettings } from '@shared/models.types.js';

export interface PlatformSettingsDocument
  extends Omit<IPlatformSettings, '_id' | 'updatedBy'>,
    Document {
  updatedBy?: Types.ObjectId;
}

const platformSettingsSchema = new Schema<PlatformSettingsDocument>(
  {
    storeName: {
      type: String,
      required: true,
      default: 'Cartiva Mini',
      trim: true,
      maxlength: 100,
    },
    storeDescription: {
      type: String,
      default: 'Everything You Need, Just a Click Away.',
      trim: true,
      maxlength: 300,
    },
    contactEmail: {
      type: String,
      required: true,
      default: 'trustezika831@gmail.com',
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: '+2348002278482',
      trim: true,
    },
    storeAddress: {
      type: String,
      default: '12 Commercial Avenue, Yaba, Lagos, Nigeria',
      trim: true,
      maxlength: 300,
    },
    defaultCurrency: {
      type: String,
      required: true,
      default: 'NGN',
      trim: true,
      uppercase: true,
    },
    supportedCurrencies: {
      type: [String],
      default: ['NGN'],
    },
    freeShippingThresholdMinor: {
      type: Number,
      default: 2500000, // ₦25,000.00 in minor units (kobo)
      min: 0,
    },
    lowStockAlertThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    orderAutoCancellationMinutes: {
      type: Number,
      default: 60,
      min: 5,
    },
    supportEmail: {
      type: String,
      default: 'trustezika831@gmail.com',
      trim: true,
      lowercase: true,
    },
    policies: {
      privacyPolicy: {
        type: String,
        default: 'Standard Cartiva Mini privacy policy safeguarding customer personal information.',
      },
      returnPolicy: {
        type: String,
        default: '7-day hassle-free returns for eligible items in original, undamaged packaging.',
      },
      termsOfService: {
        type: String,
        default: 'Cartiva Mini terms and conditions governing shopping and vendor interactions.',
      },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformSettings: Model<PlatformSettingsDocument> = model<PlatformSettingsDocument>(
  'PlatformSettings',
  platformSettingsSchema
);
