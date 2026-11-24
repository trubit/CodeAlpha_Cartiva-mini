/**
 * Cartiva Mini — Order Processing Service
 * Customer order history, details, self-service cancellation with inventory release,
 * and administrative order lifecycle management with full audit logging.
 */
import { Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from '@shared/enums.js';
import type {
  OrderDetailDto,
  OrderListItemDto,
  PaginationMeta,
  OrderAdminFilterDto,
  UpdateOrderStatusDto,
} from '@shared/api.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { orderRepository } from './order.repository.js';
import { OrderDocument } from '../../models/Order.model.js';
import {
  ORDER_CONSTANTS,
  PERMITTED_STATUS_TRANSITIONS,
  CANCELLABLE_CUSTOMER_STATUSES,
} from './order.constants.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AuditLog, type AuditLogDocument } from '../../models/AuditLog.model.js';

export class OrderService {
  /**
   * Retrieves paginated order history for an authenticated customer.
   */
  public async getCustomerOrders(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ orders: OrderListItemDto[]; meta: PaginationMeta }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), ORDER_CONSTANTS.MAX_PAGE_SIZE);

    const { orders, total } = await orderRepository.findOrdersByUserId(userId, safePage, safeLimit);

    const totalPages = Math.ceil(total / safeLimit) || 1;

    const mappedOrders: OrderListItemDto[] = orders.map((order) => {
      const firstItem = order.items[0];
      return {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        itemCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
        firstItemTitle: firstItem ? firstItem.title : 'Order Items',
        firstItemThumbnailUrl: firstItem?.thumbnailUrl,
        totalAmount: order.totalAmount,
        totalAmountMinor: order.totalAmountMinor || Math.round(order.totalAmount * 100),
        currency: order.currency || 'NGN',
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    const meta: PaginationMeta = {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    };

    return { orders: mappedOrders, meta };
  }

  /**
   * Retrieves single order detail for an authenticated customer with ownership verification.
   */
  public async getCustomerOrderDetail(userId: string, identifier: string): Promise<OrderDetailDto> {
    const order = await orderRepository.findByIdOrNumber(identifier);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ORDER_NOT_FOUND);
    }

    // Strict ownership verification (IDOR prevention)
    if (order.userId.toString() !== userId) {
      throw AppError.forbidden(
        'You are not authorized to view this order.',
        ErrorCodes.ORDER_ACCESS_DENIED
      );
    }

    return this.mapOrderToDetailDto(order);
  }

  /**
   * Allows customer to cancel an eligible order, safely releasing associated inventory reservations.
   */
  public async cancelCustomerOrder(
    userId: string,
    identifier: string,
    reason?: string
  ): Promise<OrderDetailDto> {
    const order = await orderRepository.findByIdOrNumber(identifier);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ORDER_NOT_FOUND);
    }

    // Ownership check
    if (order.userId.toString() !== userId) {
      throw AppError.forbidden(
        'You are not authorized to cancel this order.',
        ErrorCodes.ORDER_ACCESS_DENIED
      );
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw AppError.badRequest(
        'This order has already been cancelled.',
        ErrorCodes.ORDER_ALREADY_CANCELLED
      );
    }

    if (!CANCELLABLE_CUSTOMER_STATUSES.includes(order.orderStatus)) {
      throw AppError.badRequest(
        `Orders in "${order.orderStatus}" status cannot be cancelled online. Please contact customer concierge.`,
        ErrorCodes.ORDER_CANNOT_BE_CANCELLED
      );
    }

    // 1. Release inventory reservation if still active
    if (order.reservationReference) {
      try {
        await inventoryService.releaseReservation(
          order.reservationReference,
          reason || 'Customer cancelled pending order'
        );
      } catch (err: unknown) {
        // Log release attempt error but proceed with order cancellation to avoid customer lock-in
        console.warn(`[OrderCancel] Reservation release notice: ${(err as Error).message}`);
      }
    }

    // 2. Update order status
    order.orderStatus = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Customer requested order cancellation';
    await order.save();

    // 3. Record audit log
    await AuditLog.create({
      actorId: new Types.ObjectId(userId),
      actorRole: 'customer',
      action: 'ORDER_CANCELLED',
      entity: 'Order',
      entityId: order._id.toString(),
      changesDiff: {
        before: { orderStatus: OrderStatus.PENDING_PAYMENT },
        after: {
          orderNumber: order.orderNumber,
          orderStatus: OrderStatus.CANCELLED,
          cancelledBy: 'customer',
          reason: order.cancellationReason,
          releasedReservation: order.reservationReference,
        },
      },
    });

    return this.mapOrderToDetailDto(order);
  }

  /**
   * Administrative order list with multi-factor filtering and search.
   */
  public async getAdminOrders(
    filterDto: OrderAdminFilterDto
  ): Promise<{ orders: OrderDetailDto[]; meta: PaginationMeta }> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;

    const { orders, total } = await orderRepository.findAdminOrders(filterDto);
    const totalPages = Math.ceil(total / limit) || 1;

    const mapped = orders.map((order) => this.mapOrderToDetailDto(order));

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { orders: mapped, meta };
  }

  /**
   * Administrative single order inspection.
   */
  public async getAdminOrderDetail(identifier: string): Promise<OrderDetailDto> {
    const order = await orderRepository.findByIdOrNumber(identifier);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ORDER_NOT_FOUND);
    }
    return this.mapOrderToDetailDto(order);
  }

  /**
   * Administrative order status transition with state machine validation and audit recording.
   */
  public async updateAdminOrderStatus(
    adminUserId: string,
    identifier: string,
    data: UpdateOrderStatusDto
  ): Promise<OrderDetailDto> {
    const order = await orderRepository.findByIdOrNumber(identifier);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ORDER_NOT_FOUND);
    }

    const previousStatus = order.orderStatus;
    const nextStatus = data.orderStatus;

    if (previousStatus === nextStatus) {
      return this.mapOrderToDetailDto(order);
    }

    // Check valid status transition
    const allowedNextStatuses = PERMITTED_STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw AppError.badRequest(
        `Invalid status transition from "${previousStatus}" to "${nextStatus}".`,
        ErrorCodes.INVALID_ORDER_STATUS
      );
    }

    // CRITICAL: Phase 12 does NOT permit marking an order as PAID without verified payment (Phase 13 boundary)
    if (nextStatus === OrderStatus.CONFIRMED && order.paymentStatus !== PaymentStatus.PAID) {
      throw AppError.badRequest(
        'Orders cannot be marked as CONFIRMED without server-side payment verification (Phase 13).',
        ErrorCodes.INVALID_ORDER_STATUS
      );
    }

    // If transitioning to CANCELLED, release inventory reservation
    if (nextStatus === OrderStatus.CANCELLED && order.reservationReference) {
      try {
        await inventoryService.releaseReservation(
          order.reservationReference,
          data.notes || 'Administrative order cancellation'
        );
      } catch (err: unknown) {
        console.warn(`[AdminOrderCancel] Reservation release notice: ${(err as Error).message}`);
      }
    }

    order.orderStatus = nextStatus;
    if (data.trackingNumber) order.trackingNumber = data.trackingNumber;
    if (data.carrier) order.carrier = data.carrier;
    if (data.notes) order.notes = data.notes;
    if (nextStatus === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      order.cancellationReason = data.notes || 'Administrative cancellation';
    }

    await order.save();

    // Audit log
    await AuditLog.create({
      actorId: new Types.ObjectId(adminUserId),
      actorRole: 'admin',
      action: 'ORDER_STATUS_UPDATE',
      entity: 'Order',
      entityId: order._id.toString(),
      changesDiff: {
        before: { orderStatus: previousStatus },
        after: {
          orderNumber: order.orderNumber,
          orderStatus: nextStatus,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          notes: data.notes,
        },
      },
    });

    return this.mapOrderToDetailDto(order);
  }

  /**
   * Retrieves audit log history for a specific order.
   */
  public async getOrderAuditHistory(identifier: string): Promise<AuditLogDocument[]> {
    const order = await orderRepository.findByIdOrNumber(identifier);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ORDER_NOT_FOUND);
    }

    return AuditLog.find({
      entity: 'Order',
      entityId: order._id.toString(),
    })
      .sort({ timestamp: -1 })
      .populate('actorId', 'firstName lastName email role');
  }

  public mapOrderToDetailDto(order: OrderDocument): OrderDetailDto {
    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: order.userId.toString(),
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      subtotal: order.subtotal,
      subtotalMinor: order.subtotalMinor || Math.round(order.subtotal * 100),
      discountAmount: order.discountAmount || 0,
      discountAmountMinor: order.discountAmountMinor || 0,
      couponCode: order.couponCode,
      shippingFee: order.shippingFee || 0,
      shippingFeeMinor: order.shippingFeeMinor || Math.round(order.shippingFee * 100),
      taxAmount: order.taxAmount || 0,
      taxAmountMinor: order.taxAmountMinor || 0,
      totalAmount: order.totalAmount,
      totalAmountMinor: order.totalAmountMinor || Math.round(order.totalAmount * 100),
      currency: order.currency || 'NGN',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId?.toString(),
      shippingMethodId: order.shippingMethodId,
      shippingMethodName: order.shippingMethodName,
      estimatedDeliveryText: order.estimatedDeliveryText,
      reservationReference: order.reservationReference,
      checkoutSessionId: order.checkoutSessionId,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDeliveryDate: order.estimatedDeliveryDate?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
      cancellationReason: order.cancellationReason,
      notes: order.notes,
      createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const orderService = new OrderService();
