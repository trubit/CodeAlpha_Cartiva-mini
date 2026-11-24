import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { InventoryMovementType } from '@shared/enums.js';
import type { IInventoryMovement } from '@shared/models.types.js';

export interface InventoryMovementDocument
  extends Omit<IInventoryMovement, '_id' | 'productId' | 'variantId' | 'operatorId'>, Document {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  operatorId?: Types.ObjectId;
}

const inventoryMovementSchema = new Schema<InventoryMovementDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required.'],
      trim: true,
      uppercase: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: Object.values(InventoryMovementType),
      required: [true, 'Movement type is required.'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity changed is required.'],
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message: 'Quantity changed must be an integer.',
      },
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock count is required.'],
      min: [0, 'Previous stock cannot be negative.'],
    },
    newStock: {
      type: Number,
      required: [true, 'New stock count is required.'],
      min: [0, 'New stock count cannot be negative.'],
      validate: {
        validator: function (this: InventoryMovementDocument, value: number): boolean {
          return value === this.previousStock + this.quantity;
        },
        message: 'New stock must mathematically equal previous stock plus quantity changed.',
      },
    },
    referenceType: {
      type: String,
      enum: ['order', 'purchase_order', 'manual', 'reservation', 'cart', 'checkout'],
      default: 'manual',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      required: [true, 'Audit reason is required.'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Immutable inventory movement ledger
  }
);

inventoryMovementSchema.index({ productId: 1, timestamp: -1 });
inventoryMovementSchema.index({ sku: 1, timestamp: -1 });

export const InventoryMovement: Model<InventoryMovementDocument> = model<InventoryMovementDocument>(
  'InventoryMovement',
  inventoryMovementSchema
);
