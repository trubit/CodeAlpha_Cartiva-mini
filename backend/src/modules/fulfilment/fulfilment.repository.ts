/**
 * Cartiva Mini — Fulfilment Data Access Repository
 * Encapsulates Mongoose database operations for Orders and Shipments.
 */
import { Types, type FilterQuery } from 'mongoose';
import { Shipment, type ShipmentDocument } from '../../models/Shipment.model.js';
import { Order, type OrderDocument } from '../../models/Order.model.js';
import type { FulfilmentFilterDto } from '@shared/api.types.js';
import type { ITrackingEvent } from '@shared/models.types.js';

export class FulfilmentRepository {
  /**
   * Finds a shipment by its MongoDB ObjectId.
   */
  public async findShipmentById(id: string | Types.ObjectId): Promise<ShipmentDocument | null> {
    if (typeof id === 'string' && !Types.ObjectId.isValid(id)) return null;
    return Shipment.findById(id).exec();
  }

  /**
   * Finds a shipment by its unique human-readable shipment reference.
   */
  public async findShipmentByReference(reference: string): Promise<ShipmentDocument | null> {
    return Shipment.findOne({ shipmentReference: reference.toUpperCase().trim() }).exec();
  }

  /**
   * Finds the shipment associated with an order ID.
   */
  public async findShipmentByOrderId(orderId: string | Types.ObjectId): Promise<ShipmentDocument | null> {
    return Shipment.findOne({ orderId: new Types.ObjectId(orderId.toString()) }).exec();
  }

  /**
   * Finds the shipment associated with an order number.
   */
  public async findShipmentByOrderNumber(orderNumber: string): Promise<ShipmentDocument | null> {
    return Shipment.findOne({ orderNumber: orderNumber.toUpperCase().trim() }).exec();
  }

  /**
   * Finds a shipment by its tracking number.
   */
  public async findShipmentByTrackingNumber(trackingNumber: string): Promise<ShipmentDocument | null> {
    return Shipment.findOne({ trackingNumber: trackingNumber.trim() }).exec();
  }

  /**
   * Creates a new shipment record.
   */
  public async createShipment(data: Partial<ShipmentDocument>): Promise<ShipmentDocument> {
    return Shipment.create(data);
  }

  /**
   * Updates an existing shipment record.
   */
  public async updateShipment(
    id: string | Types.ObjectId,
    update: Partial<ShipmentDocument>
  ): Promise<ShipmentDocument | null> {
    return Shipment.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).exec();
  }

  /**
   * Appends a tracking event to a shipment's immutable events array.
   */
  public async appendTrackingEvent(
    shipmentId: string | Types.ObjectId,
    event: ITrackingEvent
  ): Promise<ShipmentDocument | null> {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      {
        $push: { events: event },
        $set: { status: event.status },
      },
      { new: true }
    ).exec();
  }

  /**
   * Finds an order by ObjectId or order number.
   */
  public async findOrderByIdOrNumber(identifier: string): Promise<OrderDocument | null> {
    const trimmed = identifier.trim();
    if (Types.ObjectId.isValid(trimmed)) {
      const byId = await Order.findById(trimmed).exec();
      if (byId) return byId;
    }
    return Order.findOne({ orderNumber: trimmed.toUpperCase() }).exec();
  }

  /**
   * Queries orders eligible for or currently in fulfilment with flexible filtering and search.
   */
  public async findFulfilmentOrders(
    filter: FulfilmentFilterDto
  ): Promise<{ orders: OrderDocument[]; total: number }> {
    const query: FilterQuery<OrderDocument> = {};

    // By default or when specified, exclude unverified unpaid orders from standard fulfilment lists
    // unless filtering specifically
    if (filter.status) {
      query.orderStatus = filter.status;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { customerEmail: searchRegex },
        { 'shippingAddress.recipientName': searchRegex },
        { trackingNumber: searchRegex },
      ];
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
      if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Order.countDocuments(query).exec(),
    ]);

    return { orders, total };
  }

  /**
   * Atomically updates an order's status and tracking fields.
   */
  public async updateOrderStatus(
    orderId: string | Types.ObjectId,
    updateFields: Partial<OrderDocument>
  ): Promise<OrderDocument | null> {
    return Order.findByIdAndUpdate(
      orderId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).exec();
  }
}

export const fulfilmentRepository = new FulfilmentRepository();
