import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { ReservationStatus } from '@shared/enums.js';
import type { IInventoryReservation, IInventoryReservationItem } from '@shared/models.types.js';

export interface InventoryReservationDocument
  extends Omit<IInventoryReservation, '_id' | 'userId' | 'items'>, Document {
  userId?: Types.ObjectId;
  items: Array<
    Omit<IInventoryReservationItem, 'productId' | 'variantId'> & {
      productId: Types.ObjectId;
      variantId?: Types.ObjectId;
    }
  >;
}

const reservationItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
    },
    variantId: {
      type: Schema.Types.ObjectId,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required.'],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Reserved quantity must be at least 1.'],
    },
  },
  { _id: false }
);

const inventoryReservationSchema = new Schema<InventoryReservationDocument>(
  {
    reservationId: {
      type: String,
      required: [true, 'Reservation identifier is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    items: {
      type: [reservationItemSchema],
      required: [true, 'At least one item is required in a reservation.'],
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: 'A reservation must contain at least one item.',
      },
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.PENDING,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required.'],
      index: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    confirmedAt: {
      type: Date,
    },
    releasedAt: {
      type: Date,
    },
    referenceType: {
      type: String,
      enum: ['cart', 'checkout', 'order', 'manual'],
      default: 'cart',
    },
    referenceId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = ret['reservationId'] || ret['_id']?.toString();
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Compound queries for cleanup and active reservation lookups
inventoryReservationSchema.index({ status: 1, expiresAt: 1 });
inventoryReservationSchema.index({ 'items.productId': 1, status: 1 });
inventoryReservationSchema.index({ 'items.sku': 1, status: 1 });

export const InventoryReservation: Model<InventoryReservationDocument> =
  model<InventoryReservationDocument>('InventoryReservation', inventoryReservationSchema);
