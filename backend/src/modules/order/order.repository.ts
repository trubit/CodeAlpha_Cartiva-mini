/**
 * Cartiva Mini — Order Repository
 * Encapsulates Mongoose database operations for customer and administrative order queries.
 */
import { Types } from 'mongoose';
import { Order, type OrderDocument } from '../../models/Order.model.js';
import type { OrderAdminFilterDto } from '@shared/api.types.js';

export class OrderRepository {
  /**
   * Retrieves paginated orders for a specific customer.
   */
  public async findOrdersByUserId(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ orders: OrderDocument[]; total: number }> {
    const filter = { userId: new Types.ObjectId(userId) };
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return { orders, total };
  }

  /**
   * Finds an order by its MongoDB ID.
   */
  public async findOrderById(orderId: string): Promise<OrderDocument | null> {
    if (!Types.ObjectId.isValid(orderId)) return null;
    return Order.findById(orderId);
  }

  /**
   * Finds an order by its unique public order number (e.g. ORD-17192837-A1B2C3).
   */
  public async findOrderByNumber(orderNumber: string): Promise<OrderDocument | null> {
    return Order.findOne({ orderNumber: orderNumber.trim().toUpperCase() });
  }

  /**
   * Finds an order by either MongoDB ID or public order number.
   */
  public async findByIdOrNumber(identifier: string): Promise<OrderDocument | null> {
    if (Types.ObjectId.isValid(identifier)) {
      const byId = await Order.findById(identifier);
      if (byId) return byId;
    }
    return this.findOrderByNumber(identifier);
  }

  /**
   * Administrative order search with comprehensive filtering and pagination.
   */
  public async findAdminOrders(
    filterDto: OrderAdminFilterDto
  ): Promise<{ orders: OrderDocument[]; total: number }> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filterDto.orderStatus) {
      query.orderStatus = filterDto.orderStatus;
    }

    if (filterDto.paymentStatus) {
      query.paymentStatus = filterDto.paymentStatus;
    }

    if (filterDto.search) {
      const term = filterDto.search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { 'shippingAddress.recipientName': { $regex: term, $options: 'i' } },
      ];
    }

    if (filterDto.startDate || filterDto.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (filterDto.startDate) dateQuery.$gte = new Date(filterDto.startDate);
      if (filterDto.endDate) dateQuery.$lte = new Date(filterDto.endDate);
      query.createdAt = dateQuery;
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * Updates order fields.
   */
  public async updateOrder(
    orderId: string,
    update: Record<string, unknown>
  ): Promise<OrderDocument | null> {
    return Order.findByIdAndUpdate(orderId, { $set: update }, { new: true });
  }
}

export const orderRepository = new OrderRepository();
