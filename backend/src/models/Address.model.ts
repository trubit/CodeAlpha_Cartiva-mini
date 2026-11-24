import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { IAddress } from '@shared/models.types.js';

export interface AddressDocument extends Omit<IAddress, '_id' | 'userId'>, Document {
  userId: Types.ObjectId;
}

const addressSchema = new Schema<AddressDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ownership reference is required.'],
      index: true,
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required.'],
      trim: true,
      maxlength: [100, 'Recipient name cannot exceed 100 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Recipient phone number is required.'],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid E.164 phone number.'],
    },
    streetAddress: {
      type: String,
      required: [true, 'Street address is required.'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters.'],
    },
    apartmentSuite: {
      type: String,
      trim: true,
      maxlength: [50, 'Apartment/Suite cannot exceed 50 characters.'],
    },
    city: {
      type: String,
      required: [true, 'City is required.'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State or region is required.'],
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required.'],
      default: 'Nigeria',
      trim: true,
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Delivery instructions cannot exceed 500 characters.'],
    },
    isDefaultShipping: {
      type: Boolean,
      default: false,
    },
    isDefaultBilling: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ userId: 1, isDefaultShipping: 1 });
addressSchema.index({ userId: 1, createdAt: -1 });

export const Address: Model<AddressDocument> = model<AddressDocument>('Address', addressSchema);
