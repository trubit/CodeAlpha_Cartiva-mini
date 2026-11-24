/**
 * Cartiva Mini — Order Fulfilment & Delivery Tracking Service
 * Implements the complete order fulfilment lifecycle, carrier coordination,
 * append-only tracking timelines, delivery confirmation, and exception management.
 */
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventSource,
  type UserRole,
} from '@shared/enums.js';
import type {
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
  DeliveryConfirmationDto,
  DeliveryExceptionDto,
  UpdateFulfilmentStatusDto,
  FulfilmentFilterDto,
  OrderFulfilmentDetailDto,
  CustomerTrackingDto,
  ShipmentDetailDto,
  OrderDetailDto,
  PaginationMeta,
} from '@shared/api.types.js';
import type { ITrackingEvent } from '@shared/models.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { fulfilmentRepository } from './fulfilment.repository.js';
import { CarrierProviderFactory } from './carriers/carrier.factory.js';
import { PERMITTED_STATUS_TRANSITIONS } from '../order/order.constants.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import { OrderDocument } from '../../models/Order.model.js';
import { ShipmentDocument, type TrackingEventDocument } from '../../models/Shipment.model.js';
import { logger } from '../../config/logger.js';
import { notificationService } from '../notifications/notification.service.js';
import { NotificationType, NotificationChannel } from '@shared/enums.js';
import { env } from '../../config/env.js';

interface AuthenticatedStaff {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export class FulfilmentService {
  /**
   * Generates a unique tracking event ID.
   */
  private generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  }

  /**
   * Generates a unique human-readable shipment reference.
   */
  private generateShipmentReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const entropy = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SHP-${timestamp}-${entropy}`;
  }

  /**
   * Maps a ShipmentDocument to its clean ShipmentDetailDto representation.
   */
  private mapShipmentToDto(shipment: ShipmentDocument): ShipmentDetailDto {
    return {
      id: shipment._id.toString(),
      shipmentReference: shipment.shipmentReference,
      orderId: shipment.orderId.toString(),
      orderNumber: shipment.orderNumber,
      carrierName: shipment.carrierName,
      carrierService: shipment.carrierService,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      shippingMethod: shipment.shippingMethod,
      status: shipment.status as ShipmentStatus,
      destinationAddress: shipment.destinationAddress,
      dispatchedAt: shipment.dispatchedAt ? shipment.dispatchedAt.toISOString() : undefined,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate
        ? shipment.estimatedDeliveryDate.toISOString()
        : undefined,
      actualDeliveryDate: shipment.actualDeliveryDate
        ? shipment.actualDeliveryDate.toISOString()
        : undefined,
      deliveredTo: shipment.deliveredTo,
      deliveryNotes: shipment.deliveryNotes,
      proofOfDeliveryUrl: shipment.proofOfDeliveryUrl,
      responsibleStaffName: shipment.responsibleStaffName,
      events: shipment.events.map((ev) => ({
        eventId: ev.eventId,
        status: ev.status as ShipmentStatus,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        timestamp: ev.timestamp,
        source: ev.source as TrackingEventSource,
        actorId: ev.actorId ? ev.actorId.toString() : undefined,
        actorName: ev.actorName,
        metadata: ev.metadata,
      })),
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    };
  }

  /**
   * Maps an OrderDocument to OrderDetailDto.
   */
  private mapOrderToDto(order: OrderDocument): OrderDetailDto {
    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: order.userId.toString(),
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items.map((it) => ({
        id: (it as unknown as { _id?: Types.ObjectId })._id?.toString() || it.productId.toString(),
        productId: it.productId.toString(),
        sku: it.sku,
        title: it.title,
        unitPrice: it.unitPrice,
        unitPriceMinor: it.unitPriceMinor || Math.round(it.unitPrice * 100),
        quantity: it.quantity,
        subtotal: it.subtotal,
        subtotalMinor: it.subtotalMinor || Math.round(it.subtotal * 100),
        thumbnailUrl: it.thumbnailUrl,
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      subtotal: order.subtotal,
      subtotalMinor: order.subtotalMinor || Math.round(order.subtotal * 100),
      discountAmount: order.discountAmount,
      discountAmountMinor: order.discountAmountMinor || Math.round(order.discountAmount * 100),
      couponCode: order.couponCode,
      shippingFee: order.shippingFee,
      shippingFeeMinor: order.shippingFeeMinor || Math.round(order.shippingFee * 100),
      taxAmount: order.taxAmount,
      taxAmountMinor: order.taxAmountMinor || Math.round(order.taxAmount * 100),
      totalAmount: order.totalAmount,
      totalAmountMinor: order.totalAmountMinor || Math.round(order.totalAmount * 100),
      currency: order.currency || 'NGN',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId ? order.paymentId.toString() : undefined,
      shippingMethodId: order.shippingMethodId,
      shippingMethodName: order.shippingMethodName,
      estimatedDeliveryText: order.estimatedDeliveryText,
      reservationReference: order.reservationReference,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? order.estimatedDeliveryDate.toISOString()
        : undefined,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : undefined,
      cancellationReason: order.cancellationReason,
      notes: order.notes,
      createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Retrieves paginated orders for administrative fulfilment management with status and search filters.
   */
  public async getFulfilmentOrders(
    filter: FulfilmentFilterDto
  ): Promise<{ orders: OrderFulfilmentDetailDto[]; meta: PaginationMeta }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;

    const { orders, total } = await fulfilmentRepository.findFulfilmentOrders(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    // Attach shipment information for each order
    const mapped: OrderFulfilmentDetailDto[] = await Promise.all(
      orders.map(async (order) => {
        const shipment = await fulfilmentRepository.findShipmentByOrderId(order._id);
        const orderDto = this.mapOrderToDto(order);
        const shipmentDto = shipment ? this.mapShipmentToDto(shipment) : undefined;
        return {
          order: orderDto,
          shipment: shipmentDto,
          timeline: shipmentDto?.events || [],
        };
      })
    );

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
   * Administrative detailed inspection of an order and its fulfilment history.
   */
  public async getFulfilmentOrderDetail(identifier: string): Promise<OrderFulfilmentDetailDto> {
    const order = await fulfilmentRepository.findOrderByIdOrNumber(identifier);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    const shipment = await fulfilmentRepository.findShipmentByOrderId(order._id);
    const orderDto = this.mapOrderToDto(order);
    const shipmentDto = shipment ? this.mapShipmentToDto(shipment) : undefined;

    return {
      order: orderDto,
      shipment: shipmentDto,
      timeline: shipmentDto?.events || [],
    };
  }

  /**
   * Advances an order's fulfilment status with strict state machine validation and payment verification.
   */
  public async updateFulfilmentStatus(
    staff: AuthenticatedStaff,
    identifier: string,
    dto: UpdateFulfilmentStatusDto
  ): Promise<OrderFulfilmentDetailDto> {
    const order = await fulfilmentRepository.findOrderByIdOrNumber(identifier);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    const previousStatus = order.orderStatus;
    const nextStatus = dto.status;

    if (previousStatus === nextStatus) {
      return this.getFulfilmentOrderDetail(identifier);
    }

    // MANDATORY RULE: Never allow unpaid or unverified orders to enter normal fulfilment
    const isPaid =
      order.paymentStatus === PaymentStatus.PAID ||
      order.paymentStatus === PaymentStatus.SUCCESSFUL;

    if (!isPaid) {
      throw new AppError(
        'Order is not eligible for fulfilment: Payment has not been verified.',
        400,
        ErrorCodes.ORDER_NOT_ELIGIBLE_FOR_FULFILMENT
      );
    }

    // State transition validation
    const allowed = PERMITTED_STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        `Invalid status transition from "${previousStatus}" to "${nextStatus}".`,
        400,
        ErrorCodes.INVALID_ORDER_STATUS
      );
    }

    order.orderStatus = nextStatus;
    if (dto.notes) {
      order.notes = order.notes ? `${order.notes} | ${dto.notes}` : dto.notes;
    }
    await order.save();

    // If shipment exists, append corresponding event and update shipment status
    const shipment = await fulfilmentRepository.findShipmentByOrderId(order._id);
    if (shipment) {
      let shipmentStatus = shipment.status;
      let title = `Order Status: ${nextStatus.replace(/_/g, ' ').toUpperCase()}`;
      let description = dto.notes || `Order transitioned to ${nextStatus.replace(/_/g, ' ')}.`;

      if (nextStatus === OrderStatus.PROCESSING) {
        shipmentStatus = ShipmentStatus.PROCESSING;
        title = 'Preparation Started';
        description = 'Items are being collected and prepared at the fulfilment warehouse.';
      } else if (nextStatus === OrderStatus.PACKED) {
        shipmentStatus = ShipmentStatus.PACKED;
        title = 'Order Packed';
        description = 'Order items have been securely packed and verified for shipment.';
      } else if (nextStatus === OrderStatus.READY_FOR_SHIPMENT) {
        shipmentStatus = ShipmentStatus.READY_FOR_PICKUP;
        title = 'Ready for Courier Dispatch';
        description = 'Package is sealed, labeled, and staged in the dispatch bay.';
      } else if (nextStatus === OrderStatus.SHIPPED) {
        shipmentStatus = ShipmentStatus.DISPATCHED;
        title = 'Package Dispatched';
        description = 'Package has departed Cartiva Fulfilment Center with the assigned courier.';
        if (!shipment.dispatchedAt) shipment.dispatchedAt = new Date();
      } else if (nextStatus === OrderStatus.OUT_FOR_DELIVERY) {
        shipmentStatus = ShipmentStatus.OUT_FOR_DELIVERY;
        title = 'Out for Delivery';
        description = 'Courier is en route to the delivery destination.';
      } else if (nextStatus === OrderStatus.DELIVERED) {
        shipmentStatus = ShipmentStatus.DELIVERED;
        title = 'Package Delivered';
        description = 'Shipment has been successfully delivered.';
        if (!shipment.actualDeliveryDate) shipment.actualDeliveryDate = new Date();
      } else if (nextStatus === OrderStatus.DELIVERY_FAILED) {
        shipmentStatus = ShipmentStatus.DELIVERY_FAILED;
        title = 'Delivery Attempt Failed';
        description = dto.notes || 'Courier could not complete delivery on the initial attempt.';
      }

      shipment.status = shipmentStatus;
      shipment.events.push({
        eventId: this.generateEventId(),
        status: shipmentStatus,
        title,
        description,
        location: dto.location || 'Cartiva Fulfilment Hub',
        timestamp: new Date(),
        source: TrackingEventSource.MANUAL,
        actorId: new Types.ObjectId(staff.id),
        actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
        metadata: { previousOrderStatus: previousStatus, newOrderStatus: nextStatus },
      } as unknown as TrackingEventDocument);

      await shipment.save();
    }

    // Audit Log entry
    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'ORDER_FULFILMENT_STATUS_UPDATED',
      entity: 'Order',
      entityId: order._id.toString(),
      changesDiff: {
        before: { orderStatus: previousStatus },
        after: {
          orderStatus: nextStatus,
          orderNumber: order.orderNumber,
          notes: dto.notes,
        },
      },
    });

    logger.info(
      { orderNumber: order.orderNumber, previousStatus, nextStatus, staffId: staff.id },
      'Order fulfilment status advanced'
    );

    return this.getFulfilmentOrderDetail(identifier);
  }

  /**
   * Creates a formal shipment record for an eligible paid order.
   */
  public async createShipment(
    staff: AuthenticatedStaff,
    orderIdentifier: string,
    dto: CreateShipmentDto
  ): Promise<OrderFulfilmentDetailDto> {
    const order = await fulfilmentRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    // MANDATORY RULE: Payment must be verified
    const isPaid =
      order.paymentStatus === PaymentStatus.PAID ||
      order.paymentStatus === PaymentStatus.SUCCESSFUL;

    if (!isPaid) {
      throw new AppError(
        'Cannot create shipment: Order payment has not been verified.',
        400,
        ErrorCodes.ORDER_NOT_ELIGIBLE_FOR_FULFILMENT
      );
    }

    // Prevent duplicate shipment creation
    const existingShipment = await fulfilmentRepository.findShipmentByOrderId(order._id);
    if (existingShipment && existingShipment.status !== ShipmentStatus.CANCELLED) {
      throw new AppError(
        `An active shipment (${existingShipment.shipmentReference}) already exists for this order.`,
        409,
        ErrorCodes.SHIPMENT_ALREADY_EXISTS
      );
    }

    // Resolve carrier provider
    const carrierProvider = CarrierProviderFactory.getProvider(dto.carrierName);

    const shipmentReference = this.generateShipmentReference();
    const trackingNumber =
      dto.trackingNumber?.trim() || carrierProvider.generateTrackingNumber(shipmentReference);
    const trackingUrl = dto.trackingUrl?.trim() || carrierProvider.getTrackingUrl(trackingNumber);

    const estimatedDeliveryDate = dto.estimatedDeliveryDate
      ? new Date(dto.estimatedDeliveryDate)
      : undefined;

    const initialEvents: ITrackingEvent[] = [
      {
        eventId: this.generateEventId(),
        status: ShipmentStatus.PROCESSING,
        title: 'Shipment Created',
        description: `Shipment booked with ${dto.carrierName.trim()}. Tracking Reference: ${trackingNumber}`,
        location: 'Cartiva Logistics Operations Hub',
        timestamp: new Date(),
        source: carrierProvider.isAutomated
          ? TrackingEventSource.CARRIER
          : TrackingEventSource.MANUAL,
        actorId: staff.id,
        actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
      },
    ];

    let initialStatus = ShipmentStatus.PROCESSING;
    let dispatchedAt: Date | undefined;

    if (dto.dispatchNow) {
      initialStatus = ShipmentStatus.DISPATCHED;
      dispatchedAt = new Date();
      initialEvents.push({
        eventId: this.generateEventId(),
        status: ShipmentStatus.DISPATCHED,
        title: 'Dispatched to Carrier',
        description: `Package handed over to ${dto.carrierName.trim()} for transit.`,
        location: 'Cartiva Dispatch Hub',
        timestamp: new Date(),
        source: TrackingEventSource.MANUAL,
        actorId: staff.id,
        actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
      });

      order.orderStatus = OrderStatus.SHIPPED;
    } else if (order.orderStatus === OrderStatus.CONFIRMED) {
      order.orderStatus = OrderStatus.PROCESSING;
    }

    // Sync order metadata
    order.carrier = dto.carrierName.trim();
    order.trackingNumber = trackingNumber;
    if (estimatedDeliveryDate) {
      order.estimatedDeliveryDate = estimatedDeliveryDate;
    }
    await order.save();

    // Create the shipment document
    const shipment = await fulfilmentRepository.createShipment({
      shipmentReference,
      orderId: order._id as Types.ObjectId,
      orderNumber: order.orderNumber,
      carrierName: dto.carrierName.trim(),
      carrierService: dto.carrierService?.trim(),
      trackingNumber,
      trackingUrl,
      shippingMethod: order.shippingMethodName || 'Standard Express Logistics',
      status: initialStatus,
      destinationAddress: order.shippingAddress,
      dispatchedAt,
      estimatedDeliveryDate,
      deliveryNotes: dto.deliveryNotes?.trim(),
      responsibleStaffId: new Types.ObjectId(staff.id),
      responsibleStaffName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
      events: initialEvents as unknown as Types.DocumentArray<TrackingEventDocument>,
    });

    // Audit log
    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'SHIPMENT_CREATED',
      entity: 'Shipment',
      entityId: shipment._id.toString(),
      changesDiff: {
        after: {
          orderNumber: order.orderNumber,
          shipmentReference,
          carrierName: dto.carrierName,
          trackingNumber,
          dispatchNow: Boolean(dto.dispatchNow),
        },
      },
    });

    logger.info(
      { orderNumber: order.orderNumber, shipmentReference, trackingNumber },
      'Shipment created successfully'
    );

    if (dto.dispatchNow) {
      notificationService
        .notify({
          eventType: NotificationType.ORDER_DISPATCHED,
          recipientId: order.userId.toString(),
          recipientEmail: order.customerEmail,
          title: `Order Dispatched — #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} has been dispatched with ${dto.carrierName}. Tracking: ${trackingNumber}.`,
          actionUrl: `/account/orders/${order._id.toString()}`,
          templateContext: {
            orderNumber: order.orderNumber,
            carrierName: dto.carrierName,
            trackingNumber,
            trackingUrl,
            actionUrl: `${env.FRONTEND_URL}/account/orders/${order._id.toString()}`,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })
        .catch((err) => {
          logger.error(
            { error: (err as Error).message, orderNumber: order.orderNumber },
            'Failed to dispatch order dispatched notification'
          );
        });
    }

    return this.getFulfilmentOrderDetail(orderIdentifier);
  }

  /**
   * Updates shipment attributes (carrier, tracking URL, notes).
   */
  public async updateShipment(
    staff: AuthenticatedStaff,
    shipmentId: string,
    dto: UpdateShipmentDto
  ): Promise<OrderFulfilmentDetailDto> {
    const shipment = await fulfilmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment record not found.', 404, ErrorCodes.SHIPMENT_NOT_FOUND);
    }

    if (dto.carrierName) shipment.carrierName = dto.carrierName.trim();
    if (dto.carrierService !== undefined) shipment.carrierService = dto.carrierService?.trim();
    if (dto.trackingNumber) shipment.trackingNumber = dto.trackingNumber.trim();
    if (dto.trackingUrl !== undefined) shipment.trackingUrl = dto.trackingUrl?.trim();
    if (dto.deliveryNotes !== undefined) shipment.deliveryNotes = dto.deliveryNotes?.trim();
    if (dto.estimatedDeliveryDate) {
      shipment.estimatedDeliveryDate = new Date(dto.estimatedDeliveryDate);
    }

    await shipment.save();

    // Mirror updates to Order record
    await fulfilmentRepository.updateOrderStatus(shipment.orderId, {
      carrier: shipment.carrierName,
      trackingNumber: shipment.trackingNumber,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
    });

    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'SHIPMENT_UPDATED',
      entity: 'Shipment',
      entityId: shipment._id.toString(),
      changesDiff: {
        after: {
          shipmentReference: shipment.shipmentReference,
          carrierName: shipment.carrierName,
          trackingNumber: shipment.trackingNumber,
        },
      },
    });

    return this.getFulfilmentOrderDetail(shipment.orderNumber);
  }

  /**
   * Appends an immutable tracking event to a shipment.
   */
  public async addTrackingEvent(
    staff: AuthenticatedStaff,
    shipmentId: string,
    dto: AddTrackingEventDto
  ): Promise<OrderFulfilmentDetailDto> {
    const shipment = await fulfilmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment record not found.', 404, ErrorCodes.SHIPMENT_NOT_FOUND);
    }

    const event: ITrackingEvent = {
      eventId: this.generateEventId(),
      status: dto.status,
      title: dto.title.trim(),
      description: dto.description.trim(),
      location: dto.location?.trim() || 'In Transit',
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      source: dto.source || TrackingEventSource.MANUAL,
      actorId: staff.id,
      actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
    };

    shipment.events.push(event as unknown as TrackingEventDocument);
    shipment.status = dto.status;

    // Synchronize Order status where status corresponds to higher level milestone
    const order = await fulfilmentRepository.findOrderByIdOrNumber(shipment.orderNumber);
    if (order) {
      if (dto.status === ShipmentStatus.OUT_FOR_DELIVERY) {
        order.orderStatus = OrderStatus.OUT_FOR_DELIVERY;
        await order.save();
      } else if (dto.status === ShipmentStatus.DELIVERED) {
        order.orderStatus = OrderStatus.DELIVERED;
        if (!shipment.actualDeliveryDate) shipment.actualDeliveryDate = event.timestamp;
        await order.save();
      } else if (dto.status === ShipmentStatus.DELIVERY_FAILED) {
        order.orderStatus = OrderStatus.DELIVERY_FAILED;
        await order.save();
      } else if (
        dto.status === ShipmentStatus.DISPATCHED &&
        order.orderStatus !== OrderStatus.SHIPPED
      ) {
        order.orderStatus = OrderStatus.SHIPPED;
        if (!shipment.dispatchedAt) shipment.dispatchedAt = event.timestamp;
        await order.save();
      }
    }

    await shipment.save();

    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'TRACKING_EVENT_APPENDED',
      entity: 'Shipment',
      entityId: shipment._id.toString(),
      changesDiff: {
        after: {
          shipmentReference: shipment.shipmentReference,
          eventStatus: dto.status,
          eventTitle: dto.title,
        },
      },
    });

    return this.getFulfilmentOrderDetail(shipment.orderNumber);
  }

  /**
   * Records secure delivery confirmation with recipient, timestamp, and audit logging.
   */
  public async confirmDelivery(
    staff: AuthenticatedStaff,
    shipmentId: string,
    dto: DeliveryConfirmationDto
  ): Promise<OrderFulfilmentDetailDto> {
    const shipment = await fulfilmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment record not found.', 404, ErrorCodes.SHIPMENT_NOT_FOUND);
    }

    if (shipment.status === ShipmentStatus.DELIVERED) {
      throw new AppError(
        'Delivery has already been confirmed for this shipment.',
        400,
        ErrorCodes.DELIVERY_ALREADY_CONFIRMED
      );
    }

    const actualDate = dto.actualDeliveryDate ? new Date(dto.actualDeliveryDate) : new Date();

    shipment.status = ShipmentStatus.DELIVERED;
    shipment.actualDeliveryDate = actualDate;
    shipment.deliveredTo = dto.deliveredTo.trim();
    if (dto.deliveryNotes) shipment.deliveryNotes = dto.deliveryNotes.trim();
    if (dto.proofOfDeliveryUrl) shipment.proofOfDeliveryUrl = dto.proofOfDeliveryUrl.trim();

    const confirmationEvent: ITrackingEvent = {
      eventId: this.generateEventId(),
      status: ShipmentStatus.DELIVERED,
      title: 'Delivered & Signed',
      description: `Package successfully delivered to ${dto.deliveredTo.trim()}.${
        dto.deliveryNotes ? ` Note: ${dto.deliveryNotes.trim()}` : ''
      }`,
      location: `${shipment.destinationAddress.city}, ${shipment.destinationAddress.state}`,
      timestamp: actualDate,
      source: TrackingEventSource.MANUAL,
      actorId: staff.id,
      actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
    };

    shipment.events.push(confirmationEvent as unknown as TrackingEventDocument);
    await shipment.save();

    // Advance order to DELIVERED atomically
    const order = await fulfilmentRepository.findOrderByIdOrNumber(shipment.orderNumber);
    if (order) {
      order.orderStatus = OrderStatus.DELIVERED;
      await order.save();

      // Asynchronously dispatch delivery completed notification
      notificationService
        .notify({
          eventType: NotificationType.DELIVERY_COMPLETED,
          recipientId: order.userId.toString(),
          recipientEmail: order.customerEmail,
          title: `Delivered — #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} has been delivered. Thank you for shopping with Cartiva Mini!`,
          actionUrl: `/account/orders/${order._id.toString()}`,
          templateContext: {
            orderNumber: order.orderNumber,
            actionUrl: `${env.FRONTEND_URL}/account/orders/${order._id.toString()}`,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })
        .catch((err) => {
          logger.error(
            { error: (err as Error).message, orderNumber: order.orderNumber },
            'Failed to dispatch delivery completed notification'
          );
        });
    }

    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'DELIVERY_CONFIRMED',
      entity: 'Shipment',
      entityId: shipment._id.toString(),
      changesDiff: {
        after: {
          orderNumber: shipment.orderNumber,
          shipmentReference: shipment.shipmentReference,
          deliveredTo: dto.deliveredTo,
          deliveryTimestamp: actualDate.toISOString(),
        },
      },
    });

    logger.info(
      { orderNumber: shipment.orderNumber, deliveredTo: dto.deliveredTo },
      'Delivery confirmed successfully'
    );

    return this.getFulfilmentOrderDetail(shipment.orderNumber);
  }

  /**
   * Records a delivery exception (customer unavailable, incorrect address, delayed).
   */
  public async recordDeliveryException(
    staff: AuthenticatedStaff,
    shipmentId: string,
    dto: DeliveryExceptionDto
  ): Promise<OrderFulfilmentDetailDto> {
    const shipment = await fulfilmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new AppError('Shipment record not found.', 404, ErrorCodes.SHIPMENT_NOT_FOUND);
    }

    const exceptionStatus = ShipmentStatus.DELIVERY_ATTEMPTED;
    const exceptionTimestamp = new Date();

    if (dto.rescheduledDeliveryDate) {
      shipment.estimatedDeliveryDate = new Date(dto.rescheduledDeliveryDate);
    }

    shipment.status = exceptionStatus;

    const exceptionEvent: ITrackingEvent = {
      eventId: this.generateEventId(),
      status: exceptionStatus,
      title: `Delivery Exception: ${dto.exceptionType.replace(/_/g, ' ').toUpperCase()}`,
      description: dto.description.trim(),
      location: dto.location?.trim() || `${shipment.destinationAddress.city} Delivery Depot`,
      timestamp: exceptionTimestamp,
      source: TrackingEventSource.MANUAL,
      actorId: staff.id,
      actorName: `${staff.firstName || 'Staff'} ${staff.lastName || ''}`.trim(),
      metadata: {
        exceptionType: dto.exceptionType,
        rescheduledDeliveryDate: dto.rescheduledDeliveryDate,
      },
    };

    shipment.events.push(exceptionEvent as unknown as TrackingEventDocument);
    await shipment.save();

    // Update order status to DELIVERY_FAILED or keep in fulfilment with notes
    const order = await fulfilmentRepository.findOrderByIdOrNumber(shipment.orderNumber);
    if (order) {
      order.orderStatus = OrderStatus.DELIVERY_FAILED;
      order.notes = order.notes
        ? `${order.notes} | Exception: ${dto.exceptionType}: ${dto.description}`
        : `Exception: ${dto.exceptionType}: ${dto.description}`;
      if (dto.rescheduledDeliveryDate) {
        order.estimatedDeliveryDate = new Date(dto.rescheduledDeliveryDate);
      }
      await order.save();
    }

    await AuditLog.create({
      actorId: new Types.ObjectId(staff.id),
      actorRole: staff.role || 'staff',
      action: 'DELIVERY_EXCEPTION_RECORDED',
      entity: 'Shipment',
      entityId: shipment._id.toString(),
      changesDiff: {
        after: {
          orderNumber: shipment.orderNumber,
          exceptionType: dto.exceptionType,
          description: dto.description,
        },
      },
    });

    logger.warn(
      { orderNumber: shipment.orderNumber, exceptionType: dto.exceptionType },
      'Delivery exception recorded'
    );

    return this.getFulfilmentOrderDetail(shipment.orderNumber);
  }

  /**
   * Retrieves delivery tracking details for an authenticated customer with ownership verification.
   */
  public async getCustomerTracking(
    userId: string,
    orderIdentifier: string
  ): Promise<CustomerTrackingDto> {
    const order = await fulfilmentRepository.findOrderByIdOrNumber(orderIdentifier);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    // Strict ownership verification (IDOR prevention)
    if (order.userId.toString() !== userId) {
      throw new AppError(
        'You are not authorized to view tracking for this order.',
        403,
        ErrorCodes.ORDER_ACCESS_DENIED
      );
    }

    const shipment = await fulfilmentRepository.findShipmentByOrderId(order._id);

    // If shipment exists, return real events; otherwise synthesize initial verified stages
    let events: ITrackingEvent[] = [];
    let fulfilmentStatus: ShipmentStatus = ShipmentStatus.PENDING;

    if (shipment) {
      fulfilmentStatus = shipment.status as ShipmentStatus;
      events = shipment.events.map((ev) => ({
        eventId: ev.eventId,
        status: ev.status as ShipmentStatus,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        timestamp: ev.timestamp,
        source: ev.source as TrackingEventSource,
        actorName: ev.actorName,
      }));
    } else {
      // Order placed event
      events.push({
        eventId: `evt_init_${order._id}`,
        status: ShipmentStatus.PENDING,
        title: 'Order Placed',
        description: `Order ${order.orderNumber} successfully registered in system.`,
        timestamp: order.createdAt,
        source: TrackingEventSource.SYSTEM,
      });

      if (
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.SUCCESSFUL
      ) {
        events.push({
          eventId: `evt_paid_${order._id}`,
          status: ShipmentStatus.PROCESSING,
          title: 'Payment Verified & Confirmed',
          description: 'Payment was authoritatively verified. Staged for warehouse preparation.',
          timestamp: order.updatedAt,
          source: TrackingEventSource.SYSTEM,
        });
        fulfilmentStatus = ShipmentStatus.PROCESSING;
      }
    }

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString(),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus,
      carrierName: shipment?.carrierName || order.carrier,
      carrierService: shipment?.carrierService,
      trackingNumber: shipment?.trackingNumber || order.trackingNumber,
      trackingUrl: shipment?.trackingUrl,
      shippingMethod: order.shippingMethodName || 'Standard Express Delivery',
      destinationAddress: order.shippingAddress,
      dispatchedAt: shipment?.dispatchedAt ? shipment.dispatchedAt.toISOString() : undefined,
      estimatedDeliveryDate: (shipment?.estimatedDeliveryDate || order.estimatedDeliveryDate)
        ? (shipment?.estimatedDeliveryDate || order.estimatedDeliveryDate)!.toISOString()
        : undefined,
      actualDeliveryDate: shipment?.actualDeliveryDate
        ? shipment.actualDeliveryDate.toISOString()
        : undefined,
      deliveredTo: shipment?.deliveredTo,
      items: order.items.map((it) => ({
        productId: it.productId.toString(),
        sku: it.sku,
        title: it.title,
        unitPrice: it.unitPrice,
        unitPriceMinor: it.unitPriceMinor || Math.round(it.unitPrice * 100),
        quantity: it.quantity,
        subtotal: it.subtotal,
        subtotalMinor: it.subtotalMinor || Math.round(it.subtotal * 100),
        thumbnailUrl: it.thumbnailUrl,
      })),
      events,
    };
  }
}

export const fulfilmentService = new FulfilmentService();
