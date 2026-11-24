import { Schema, model, type Document, type Model } from 'mongoose';
import { ShippingCalculationType } from '@shared/enums.js';
import type { IShippingConfiguration } from '@shared/models.types.js';

export interface ShippingConfigurationDocument
  extends Omit<IShippingConfiguration, '_id'>, Document {}

const shippingConfigurationSchema = new Schema<ShippingConfigurationDocument>(
  {
    zoneName: {
      type: String,
      required: [true, 'Zone name is required.'],
      trim: true,
      maxlength: [100, 'Zone name cannot exceed 100 characters.'],
    },
    methodName: {
      type: String,
      required: [true, 'Method name is required.'],
      trim: true,
      maxlength: [100, 'Method name cannot exceed 100 characters.'],
      default: 'Standard Delivery',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters.'],
    },
    countriesCovered: {
      type: [String],
      default: ['Nigeria'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one country must be specified.',
      },
    },
    statesCovered: {
      type: [String],
      required: [true, 'At least one state or territory must be covered.'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one state must be specified.',
      },
    },
    carrierName: {
      type: String,
      required: [true, 'Carrier name is required.'],
      trim: true,
    },
    rateCalculationType: {
      type: String,
      enum: Object.values(ShippingCalculationType),
      default: ShippingCalculationType.FLAT,
    },
    baseRate: {
      type: Number,
      required: [true, 'Base shipping rate is required.'],
      min: [0, 'Base rate cannot be negative.'],
    },
    ratePerAdditionalKg: {
      type: Number,
      default: 0,
      min: [0, 'Additional rate per kg cannot be negative.'],
    },
    freeShippingThreshold: {
      type: Number,
      min: [0, 'Free shipping threshold cannot be negative.'],
    },
    estimatedDeliveryDaysMin: {
      type: Number,
      required: [true, 'Minimum delivery days is required.'],
      min: [0, 'Minimum delivery days cannot be negative.'],
    },
    estimatedDeliveryDaysMax: {
      type: Number,
      required: [true, 'Maximum delivery days is required.'],
      min: [0, 'Maximum delivery days cannot be negative.'],
      validate: {
        validator: function (this: ShippingConfigurationDocument, value: number): boolean {
          return value >= this.estimatedDeliveryDaysMin;
        },
        message: 'Maximum delivery days must be greater than or equal to minimum delivery days.',
      },
    },
    currency: {
      type: String,
      default: 'NGN',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shippingConfigurationSchema.index({ countriesCovered: 1, isActive: 1 });
shippingConfigurationSchema.index({ statesCovered: 1, isActive: 1 });
shippingConfigurationSchema.index({ zoneName: 1, methodName: 1 });

export const ShippingConfiguration: Model<ShippingConfigurationDocument> =
  model<ShippingConfigurationDocument>('ShippingConfiguration', shippingConfigurationSchema);
