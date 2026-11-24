import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { ShipmentStatus, TrackingEventSource } from '@shared/enums.js';
import type { IShipment, ITrackingEvent } from '@shared/models.types.js';

export interface TrackingEventDocument
  extends Omit<ITrackingEvent, 'actorId'>,
    Document {
  actorId?: Types.ObjectId;
}

export interface ShipmentDocument
  extends Omit<IShipment, '_id' | 'orderId' | 'responsibleStaffId' | 'events'>,
    Document {
  orderId: Types.ObjectId;
  responsibleStaffId?: Types.ObjectId;
  events: Types.DocumentArray<TrackingEventDocument>;
}

const addressSnapshotSubSchema = new Schema(
  {
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    apartmentSuite: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, default: 'Nigeria' },
  },
  { _id: false }
);

const trackingEventSubSchema = new Schema<TrackingEventDocument>(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(TrackingEventSource),
      default: TrackingEventSource.MANUAL,
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    shipmentReference: {
      type: String,
      required: [true, 'Shipment reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required.'],
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required.'],
      trim: true,
      uppercase: true,
    },
    carrierName: {
      type: String,
      required: [true, 'Carrier name is required.'],
      trim: true,
    },
    carrierService: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      required: [true, 'Tracking number is required.'],
      trim: true,
    },
    trackingUrl: {
      type: String,
      trim: true,
    },
    shippingMethod: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      default: ShipmentStatus.PENDING,
      index: true,
    },
    originAddress: {
      type: addressSnapshotSubSchema,
    },
    destinationAddress: {
      type: addressSnapshotSubSchema,
      required: [true, 'Destination address snapshot is required.'],
    },
    dispatchedAt: {
      type: Date,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    deliveredTo: {
      type: String,
      trim: true,
    },
    deliveryNotes: {
      type: String,
      trim: true,
    },
    proofOfDeliveryUrl: {
      type: String,
      trim: true,
    },
    responsibleStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    responsibleStaffName: {
      type: String,
      trim: true,
    },
    events: {
      type: [trackingEventSubSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ orderNumber: 1 });
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 });

export const Shipment: Model<ShipmentDocument> = model<ShipmentDocument>('Shipment', shipmentSchema);
