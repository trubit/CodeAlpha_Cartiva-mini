/**
 * Cartiva Mini — Checkout & Order Processing Service
 * Authoritative server-side checkout management, financial precision (minor units),
 * atomic inventory reservation integration, and secure order creation.
 */
import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  CheckoutStep,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ShippingCalculationType,
} from '@shared/enums.js';
import type {
  CheckoutSessionDto,
  CheckoutSummaryDto,
  CheckoutValidateResponseDto,
  CheckoutConfirmRequestDto,
  CheckoutConfirmResponseDto,
  OrderDetailDto,
} from '@shared/api.types.js';
import type { IAddressSnapshot, IOrderItem } from '@shared/models.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { CHECKOUT_CONSTANTS } from './checkout.constants.js';
import { checkoutRepository } from './checkout.repository.js';
import { CheckoutSession, CheckoutSessionDocument } from '../../models/CheckoutSession.model.js';
import { Order, OrderDocument } from '../../models/Order.model.js';
import { Cart } from '../../models/Cart.model.js';
import { cartRepository } from '../cart/cart.repository.js';
import { cartService } from '../cart/cart.service.js';
import { Address } from '../../models/Address.model.js';
import { shippingRepository } from '../shipping/shipping.repository.js';
import { normalizeNigerianLocation, buildStateMatchingRegex } from '../shipping/location-normalizer.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { Product } from '../../models/Product.model.js';
import { User } from '../../models/User.model.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import { notificationService } from '../notifications/notification.service.js';
import { NotificationType, NotificationChannel } from '@shared/enums.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class CheckoutService {
  /**
   * Initializes or resumes a checkout session for an authenticated user.
   */
  public async getOrCreateSession(userId: string): Promise<CheckoutSessionDto> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Validate that user has a cart with items
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.badRequest(
        'Your shopping cart is empty. Add products before proceeding to checkout.',
        ErrorCodes.CHECKOUT_EMPTY_CART
      );
    }

    // 2. Fetch or create checkout session
    let session = await checkoutRepository.findActiveSessionByUser(userId);

    // If active session belongs to a different cart, discard stale session
    if (session && session.cartId.toString() !== cart._id.toString()) {
      await checkoutRepository.deleteSession(session.sessionId);
      session = null;
    }

    if (!session) {
      const sessionId = `cs_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const expiresAt = new Date(Date.now() + CHECKOUT_CONSTANTS.SESSION_TTL_MINUTES * 60 * 1000);

      // Pre-select default address if user has one
      const defaultAddress = await Address.findOne({
        userId: userObjectId,
        $or: [{ isDefaultShipping: true }, { isDefault: true }],
      });

      let shippingAddressSnapshot: IAddressSnapshot | undefined;
      let shippingAddressId: Types.ObjectId | undefined;

      if (defaultAddress) {
        const normalized = normalizeNigerianLocation(
          defaultAddress.state,
          defaultAddress.city,
          defaultAddress.streetAddress,
          defaultAddress.country
        );

        shippingAddressId = defaultAddress._id as Types.ObjectId;
        shippingAddressSnapshot = {
          recipientName: defaultAddress.recipientName,
          phone: defaultAddress.phone,
          streetAddress: defaultAddress.streetAddress,
          apartmentSuite: defaultAddress.apartmentSuite,
          city: normalized.city,
          state: normalized.state,
          postalCode: defaultAddress.postalCode,
          country: normalized.country || 'Nigeria',
        };
      }

      session = await checkoutRepository.createSession({
        sessionId,
        userId: userObjectId,
        cartId: cart._id as Types.ObjectId,
        shippingAddressId,
        shippingAddressSnapshot,
        step: shippingAddressSnapshot ? CheckoutStep.SHIPPING : CheckoutStep.ADDRESS,
        currency: cart.currency || CHECKOUT_CONSTANTS.DEFAULT_CURRENCY,
        expiresAt,
      });
    }

    // 3. Re-calculate financial totals for the session
    return this.refreshSessionFinancials(session);
  }

  /**
   * Sets delivery address for the checkout session.
   */
  public async setDeliveryAddress(userId: string, addressId: string): Promise<CheckoutSessionDto> {
    const session = await checkoutRepository.findActiveSessionByUser(userId);
    if (!session) {
      throw AppError.notFound(
        'No active checkout session found.',
        ErrorCodes.CHECKOUT_SESSION_NOT_FOUND
      );
    }

    // Validate address exists and belongs to this user (IDOR prevention)
    const address = await Address.findById(addressId);
    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ADDRESS_NOT_FOUND);
    }

    if (address.userId.toString() !== userId) {
      throw AppError.forbidden(
        'You are not authorized to use this address.',
        ErrorCodes.ADDRESS_ACCESS_DENIED
      );
    }

    const normalized = normalizeNigerianLocation(
      address.state,
      address.city,
      address.streetAddress,
      address.country
    );

    const shippingAddressSnapshot: IAddressSnapshot = {
      recipientName: address.recipientName,
      phone: address.phone,
      streetAddress: address.streetAddress,
      apartmentSuite: address.apartmentSuite,
      city: normalized.city,
      state: normalized.state,
      postalCode: address.postalCode,
      country: normalized.country || 'Nigeria',
    };

    // Update address in session
    session.shippingAddressId = address._id as Types.ObjectId;
    session.shippingAddressSnapshot = shippingAddressSnapshot;

    // Check if previously selected shipping method is still valid for this destination
    if (session.shippingMethodId) {
      const isStillValid = await this.verifyShippingMethodCoversDestination(
        session.shippingMethodId.toString(),
        address.country,
        address.state
      );
      if (!isStillValid) {
        session.shippingMethodId = undefined;
        session.shippingMethodSnapshot = undefined;
        session.shippingFeeMinor = 0;
      }
    }

    session.step = session.shippingMethodId ? CheckoutStep.REVIEW : CheckoutStep.SHIPPING;
    session.expiresAt = new Date(Date.now() + CHECKOUT_CONSTANTS.SESSION_TTL_MINUTES * 60 * 1000);
    await session.save();

    return this.refreshSessionFinancials(session);
  }

  /**
   * Sets shipping method for the checkout session.
   */
  public async setShippingMethod(
    userId: string,
    shippingMethodId: string
  ): Promise<CheckoutSessionDto> {
    const session = await checkoutRepository.findActiveSessionByUser(userId);
    if (!session) {
      throw AppError.notFound(
        'No active checkout session found.',
        ErrorCodes.CHECKOUT_SESSION_NOT_FOUND
      );
    }

    if (!session.shippingAddressSnapshot) {
      throw AppError.badRequest(
        'Please select a delivery address before selecting a shipping method.',
        ErrorCodes.CHECKOUT_INCOMPLETE
      );
    }

    const config = await shippingRepository.findById(shippingMethodId);
    if (!config || !config.isActive) {
      throw AppError.notFound(
        'Shipping method not found or currently inactive.',
        ErrorCodes.SHIPPING_CONFIG_NOT_FOUND
      );
    }

    // Verify method covers destination
    const coversDestination = await this.verifyShippingMethodCoversDestination(
      shippingMethodId,
      session.shippingAddressSnapshot.country,
      session.shippingAddressSnapshot.state
    );

    if (!coversDestination) {
      throw AppError.badRequest(
        `Selected shipping method does not deliver to ${session.shippingAddressSnapshot.state}, ${session.shippingAddressSnapshot.country}.`,
        ErrorCodes.SHIPPING_UNAVAILABLE_FOR_LOCATION
      );
    }

    // Compute authoritative quote
    const { cart: cartDto } = await cartService.getCart({ userId });
    const subtotalMinor = cartDto.subtotalMinor || 0;
    const cart = await cartRepository.findCartById(session.cartId.toString());
    const totalWeightKg = await this.calculateCartWeight(cart);

    const baseRateMinor = Math.round(config.baseRate * 100);
    const freeThresholdMinor =
      config.freeShippingThreshold !== undefined && config.freeShippingThreshold !== null
        ? Math.round(config.freeShippingThreshold * 100)
        : undefined;

    let feeMinor = baseRateMinor;
    let isFreeShipping = false;

    if (
      config.rateCalculationType === ShippingCalculationType.FREE_ABOVE_THRESHOLD &&
      freeThresholdMinor !== undefined &&
      subtotalMinor >= freeThresholdMinor
    ) {
      feeMinor = 0;
      isFreeShipping = true;
    } else if (
      config.rateCalculationType === ShippingCalculationType.WEIGHT_TIERED &&
      config.ratePerAdditionalKg
    ) {
      const ratePerKgMinor = Math.round(config.ratePerAdditionalKg * 100);
      const baseWeightKg = 1;
      const excessKg = Math.max(0, Math.ceil(totalWeightKg - baseWeightKg));
      feeMinor = baseRateMinor + excessKg * ratePerKgMinor;
    }

    const minDays = config.estimatedDeliveryDaysMin;
    const maxDays = config.estimatedDeliveryDaysMax;
    const estimatedDeliveryText =
      minDays === maxDays
        ? `${minDays} business day${minDays > 1 ? 's' : ''}`
        : `${minDays}–${maxDays} business days`;

    session.shippingMethodId = config._id as Types.ObjectId;
    session.shippingMethodSnapshot = {
      methodId: config._id.toString(),
      methodName: config.methodName,
      carrierName: config.carrierName || config.zoneName,
      fee: feeMinor / 100,
      feeMinor,
      currency: config.currency || 'NGN',
      estimatedDeliveryText,
      isFreeShipping,
    };
    session.shippingFeeMinor = feeMinor;
    session.step = CheckoutStep.REVIEW;
    session.expiresAt = new Date(Date.now() + CHECKOUT_CONSTANTS.SESSION_TTL_MINUTES * 60 * 1000);
    await session.save();

    return this.refreshSessionFinancials(session);
  }

  /**
   * Retrieves full checkout summary with live authoritative line items and validation flags.
   */
  public async getSessionSummary(userId: string): Promise<CheckoutSummaryDto> {
    const session = await checkoutRepository.findActiveSessionByUser(userId);
    if (!session) {
      throw AppError.notFound(
        'No active checkout session found.',
        ErrorCodes.CHECKOUT_SESSION_NOT_FOUND
      );
    }

    const cart = await cartRepository.findCartById(session.cartId.toString());
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.badRequest('Your shopping cart is empty.', ErrorCodes.CHECKOUT_EMPTY_CART);
    }

    const { lineItems, subtotalMinor, issues } = await this.resolveAuthoritativeItems(cart);

    let shippingFeeMinor = session.shippingFeeMinor || 0;
    if (session.shippingMethodSnapshot) {
      shippingFeeMinor = session.shippingMethodSnapshot.feeMinor;
    }

    const discountAmountMinor = session.discountAmountMinor || 0;
    const taxAmountMinor = session.taxAmountMinor || 0;
    const totalAmountMinor = Math.max(
      0,
      subtotalMinor - discountAmountMinor + shippingFeeMinor + taxAmountMinor
    );

    const isReadyForOrder =
      issues.length === 0 &&
      Boolean(session.shippingAddressSnapshot) &&
      Boolean(session.shippingMethodSnapshot);

    return {
      sessionId: session.sessionId,
      step: session.step,
      items: lineItems,
      subtotal: subtotalMinor / 100,
      subtotalMinor,
      shippingFee: shippingFeeMinor / 100,
      shippingFeeMinor,
      discountAmount: discountAmountMinor / 100,
      discountAmountMinor,
      taxAmount: taxAmountMinor / 100,
      taxAmountMinor,
      totalAmount: totalAmountMinor / 100,
      totalAmountMinor,
      currency: session.currency || 'NGN',
      shippingAddress: session.shippingAddressSnapshot,
      shippingMethod: session.shippingMethodSnapshot,
      isReadyForOrder,
      isReadyForConfirmation: isReadyForOrder,
      validationIssues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Pre-flight checkout validation without creating an order.
   */
  public async validateCheckout(userId: string): Promise<CheckoutValidateResponseDto> {
    const summary = await this.getSessionSummary(userId);
    const issues: string[] = [...(summary.validationIssues || [])];

    if (!summary.shippingAddress) {
      issues.push('Delivery address is required.');
    }
    if (!summary.shippingMethod) {
      issues.push('Shipping method is required.');
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary,
    };
  }

  /**
   * Authoritative order confirmation and creation.
   * Atomically reserves stock, creates immutable order snapshots, empties the cart, and records audit trail.
   */
  public async confirmOrder(
    userId: string,
    data: CheckoutConfirmRequestDto
  ): Promise<CheckoutConfirmResponseDto> {
    const session = await checkoutRepository.findActiveSessionByUser(userId);
    if (!session) {
      // Idempotency guard: If user recently confirmed an order within 60 seconds (double-click/network retry)
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const recentConfirmedSession = await CheckoutSession.findOne({
        userId: new Types.ObjectId(userId),
        step: CheckoutStep.CONFIRMED,
        orderId: { $exists: true, $ne: null },
        updatedAt: { $gte: sixtySecondsAgo },
      }).sort({ updatedAt: -1 });

      if (recentConfirmedSession && recentConfirmedSession.orderId) {
        const existingOrder = await Order.findById(recentConfirmedSession.orderId);
        if (existingOrder) {
          logger.info(
            { orderNumber: existingOrder.orderNumber, userId },
            'Idempotent checkout confirm: returning existing confirmed order within 60s window'
          );
          return {
            orderId: existingOrder._id.toString(),
            orderNumber: existingOrder.orderNumber,
            totalAmount: existingOrder.totalAmount,
            totalAmountMinor: existingOrder.totalAmountMinor || Math.round(existingOrder.totalAmount * 100),
            currency: existingOrder.currency,
            orderStatus: existingOrder.orderStatus,
            paymentStatus: existingOrder.paymentStatus,
            reservationReference: existingOrder.reservationReference || 'N/A',
            message: 'Your order has been created successfully. Proceed to payment verification.',
            nextSteps:
              'Please complete payment via Paystack to confirm your order and initiate fulfilment (Phase 13).',
            order: this.mapOrderToDetailDto(existingOrder),
          };
        }
      }

      throw AppError.notFound(
        'Checkout session expired or not found. Please restart checkout.',
        ErrorCodes.CHECKOUT_SESSION_NOT_FOUND
      );
    }

    if (!session.shippingAddressSnapshot) {
      throw AppError.badRequest(
        'Please select a delivery address before confirming your order.',
        ErrorCodes.CHECKOUT_INCOMPLETE
      );
    }

    if (!session.shippingMethodSnapshot || !session.shippingMethodId) {
      throw AppError.badRequest(
        'Please select a shipping method before confirming your order.',
        ErrorCodes.CHECKOUT_INCOMPLETE
      );
    }

    const cart = await cartRepository.findCartById(session.cartId.toString());
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.badRequest('Your shopping cart is empty.', ErrorCodes.CHECKOUT_EMPTY_CART);
    }

    // 1. Authoritative price and stock verification
    const { lineItems, subtotalMinor, issues } = await this.resolveAuthoritativeItems(cart);
    if (issues.length > 0) {
      throw AppError.badRequest(
        `Unable to place order: ${issues.join('; ')}`,
        ErrorCodes.INSUFFICIENT_STOCK
      );
    }

    // 2. Authoritative shipping calculation re-verification
    const config = await shippingRepository.findById(session.shippingMethodId.toString());
    if (!config || !config.isActive) {
      throw AppError.badRequest(
        'Selected shipping method is no longer available.',
        ErrorCodes.INVALID_SHIPPING_METHOD
      );
    }

    const baseRateMinor = Math.round(config.baseRate * 100);
    const freeThresholdMinor =
      config.freeShippingThreshold !== undefined && config.freeShippingThreshold !== null
        ? Math.round(config.freeShippingThreshold * 100)
        : undefined;

    let shippingFeeMinor = baseRateMinor;
    if (
      config.rateCalculationType === ShippingCalculationType.FREE_ABOVE_THRESHOLD &&
      freeThresholdMinor !== undefined &&
      subtotalMinor >= freeThresholdMinor
    ) {
      shippingFeeMinor = 0;
    } else if (
      config.rateCalculationType === ShippingCalculationType.WEIGHT_TIERED &&
      config.ratePerAdditionalKg
    ) {
      const totalWeightKg = await this.calculateCartWeight(cart);
      const ratePerKgMinor = Math.round(config.ratePerAdditionalKg * 100);
      const baseWeightKg = 1;
      const excessKg = Math.max(0, Math.ceil(totalWeightKg - baseWeightKg));
      shippingFeeMinor = baseRateMinor + excessKg * ratePerKgMinor;
    }

    // 3. Atomically reserve inventory for all items
    const reservationItems = lineItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      quantity: item.quantity,
    }));

    let reservation;
    try {
      reservation = await inventoryService.createReservation({
        items: reservationItems,
        expiresInMinutes: CHECKOUT_CONSTANTS.RESERVATION_TTL_MINUTES,
        idempotencyKey: data.idempotencyKey || `ord_res_${session.sessionId}`,
        userId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Inventory reservation failed';
      throw AppError.badRequest(
        `Could not reserve stock for order items: ${message}`,
        ErrorCodes.INVENTORY_RESERVATION_FAILED
      );
    }

    // 4. Compute final financial totals
    const discountAmountMinor = 0;
    const taxAmountMinor = 0;
    const totalAmountMinor = Math.max(
      0,
      subtotalMinor - discountAmountMinor + shippingFeeMinor + taxAmountMinor
    );

    const subtotal = subtotalMinor / 100;
    const shippingFee = shippingFeeMinor / 100;
    const totalAmount = totalAmountMinor / 100;

    // 5. Fetch user profile for contact snapshot
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User account not found.', ErrorCodes.USER_NOT_FOUND);
    }

    // 6. Generate unique orderNumber
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 7. Map items to immutable order item snapshots
    const orderItemsSnapshot: IOrderItem[] = lineItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      title: item.title,
      unitPrice: item.unitPrice,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      subtotal: item.subtotal,
      subtotalMinor: item.subtotalMinor,
      thumbnailUrl: item.thumbnailUrl,
    }));

    // 8. Create Order record in PENDING_PAYMENT state (Payment verification deferred to Phase 13)
    const order = await Order.create({
      orderNumber,
      userId: new Types.ObjectId(userId),
      customerEmail: user.email,
      customerPhone: session.shippingAddressSnapshot.phone || user.phone || 'N/A',
      items: orderItemsSnapshot,
      shippingAddress: session.shippingAddressSnapshot,
      subtotal,
      subtotalMinor,
      discountAmount: 0,
      discountAmountMinor: 0,
      shippingFee,
      shippingFeeMinor,
      taxAmount: 0,
      taxAmountMinor: 0,
      totalAmount,
      totalAmountMinor,
      currency: session.currency || 'NGN',
      orderStatus: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      shippingMethodId: config._id.toString(),
      shippingMethodName: config.methodName,
      estimatedDeliveryText: session.shippingMethodSnapshot.estimatedDeliveryText,
      reservationReference: reservation.reservationId,
      checkoutSessionId: session.sessionId,
      notes: data.customerNotes,
    });

    // 9. Empty customer cart items
    await Cart.updateOne(
      { _id: cart._id },
      { $set: { items: [], subtotal: 0, discountAmount: 0 } }
    );

    // 10. Update checkout session step to CONFIRMED
    await checkoutRepository.updateSession(session.sessionId, {
      step: CheckoutStep.CONFIRMED,
      orderId: order._id as Types.ObjectId,
      orderNumber,
    });

    // 11. Record immutable audit log (Schema-compliant & non-blocking)
    try {
      await AuditLog.create({
        actorId: new Types.ObjectId(userId),
        actorRole: user.role,
        action: 'ORDER_CREATE',
        entity: 'Order',
        entityId: order._id.toString(),
        changesDiff: {
          after: {
            orderNumber,
            totalAmount,
            totalAmountMinor,
            itemCount: lineItems.length,
            reservationReference: reservation.reservationId,
            paymentStatus: PaymentStatus.PENDING,
          },
        },
      });
    } catch (auditErr) {
      logger.warn(
        { error: (auditErr as Error).message, orderNumber },
        'Non-blocking notice: could not write audit log entry during order confirmation'
      );
    }

    const orderDetail = this.mapOrderToDetailDto(order);

    // Asynchronously dispatch order confirmation notifications (In-app + Email outbox)
    notificationService
      .notify({
        eventType: NotificationType.ORDER_CONFIRMED,
        recipientId: order.userId.toString(),
        recipientEmail: order.customerEmail,
        title: `Order Placed — #${order.orderNumber}`,
        message: `Your order #${order.orderNumber} has been placed successfully. Total: ₦${order.totalAmount.toLocaleString()}.`,
        actionUrl: `/account/orders/${order._id.toString()}`,
        templateContext: {
          orderNumber: order.orderNumber,
          orderTotal: order.totalAmount,
          actionUrl: `${env.FRONTEND_URL}/account/orders/${order._id.toString()}`,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
      .catch((err) => {
        logger.error(
          { error: (err as Error).message, orderNumber: order.orderNumber },
          'Failed to dispatch order confirmation notification'
        );
      });

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      totalAmountMinor: order.totalAmountMinor || totalAmountMinor,
      currency: order.currency,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      reservationReference: reservation.reservationId,
      message: 'Your order has been created successfully. Proceed to payment verification.',
      nextSteps:
        'Please complete payment via Paystack to confirm your order and initiate fulfilment (Phase 13).',
      order: orderDetail,
    };
  }

  // ==========================================================================
  // Helper & Calculation Methods
  // ==========================================================================

  private async refreshSessionFinancials(
    session: CheckoutSessionDocument
  ): Promise<CheckoutSessionDto> {
    const { cart: cartDto } = await cartService.getCart({
      userId: session.userId.toString(),
    });

    const subtotalMinor = cartDto.subtotalMinor || 0;
    const shippingFeeMinor = session.shippingFeeMinor || 0;
    const discountAmountMinor = session.discountAmountMinor || 0;
    const taxAmountMinor = session.taxAmountMinor || 0;
    const totalAmountMinor = Math.max(
      0,
      subtotalMinor - discountAmountMinor + shippingFeeMinor + taxAmountMinor
    );

    session.subtotalMinor = subtotalMinor;
    session.totalAmountMinor = totalAmountMinor;
    await session.save();

    return {
      sessionId: session.sessionId,
      step: session.step,
      cart: cartDto,
      shippingAddressId: session.shippingAddressId?.toString(),
      shippingAddressSnapshot: session.shippingAddressSnapshot,
      shippingMethodId: session.shippingMethodId?.toString(),
      shippingMethodSnapshot: session.shippingMethodSnapshot,
      subtotal: subtotalMinor / 100,
      subtotalMinor,
      shippingFee: shippingFeeMinor / 100,
      shippingFeeMinor,
      discountAmount: discountAmountMinor / 100,
      discountAmountMinor,
      taxAmount: taxAmountMinor / 100,
      taxAmountMinor,
      totalAmount: totalAmountMinor / 100,
      totalAmountMinor,
      currency: session.currency || 'NGN',
      expiresAt: session.expiresAt.toISOString(),
      orderId: session.orderId?.toString(),
      orderNumber: session.orderNumber,
    };
  }

  private async resolveAuthoritativeItems(cart: {
    items: Array<{
      productId: string | Types.ObjectId;
      variantId?: string | Types.ObjectId;
      sku?: string;
      title?: string;
      quantity: number;
      thumbnailUrl?: string;
    }>;
  }): Promise<{
    lineItems: Array<{
      productId: string;
      variantId?: string;
      sku: string;
      title: string;
      unitPrice: number;
      unitPriceMinor: number;
      quantity: number;
      subtotal: number;
      subtotalMinor: number;
      thumbnailUrl?: string;
    }>;
    subtotalMinor: number;
    issues: string[];
  }> {
    const lineItems = [];
    const issues: string[] = [];
    let subtotalMinor = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.status !== ProductStatus.PUBLISHED) {
        issues.push(`Product "${item.title || item.sku}" is currently unavailable or unlisted.`);
        continue;
      }

      // Authoritative pricing from Product model (never client price)
      const priceInfo = cartService.determineAuthoritativePrice(
        product,
        item.variantId?.toString()
      );
      const lineSubtotalMinor = priceInfo.unitPriceMinor * item.quantity;
      subtotalMinor += lineSubtotalMinor;

      // Check stock availability
      const target = await inventoryRepository.resolveTarget(
        product._id.toString(),
        item.variantId?.toString()
      );

      if (target && target.isInventoryTracked && target.availableQuantity < item.quantity) {
        issues.push(
          `Insufficient stock for "${product.title}" (${target.availableQuantity} available, ${item.quantity} requested).`
        );
      }

      lineItems.push({
        productId: product._id.toString(),
        variantId: item.variantId?.toString(),
        sku: item.sku || product.sku,
        title: product.title,
        unitPrice: priceInfo.unitPrice,
        unitPriceMinor: priceInfo.unitPriceMinor,
        quantity: item.quantity,
        subtotal: lineSubtotalMinor / 100,
        subtotalMinor: lineSubtotalMinor,
        thumbnailUrl: item.thumbnailUrl || product.images?.[0]?.url,
      });
    }

    return { lineItems, subtotalMinor, issues };
  }

  private async calculateCartWeight(
    cart: { items: Array<{ productId: string | Types.ObjectId; quantity: number }> } | null
  ): Promise<number> {
    if (!cart || !cart.items) return 0.5;
    let totalGrams = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      const itemWeight =
        product?.weightGrams && product.weightGrams > 0 ? product.weightGrams : 500;
      totalGrams += itemWeight * item.quantity;
    }

    return Math.max(0.5, totalGrams / 1000);
  }

  private async verifyShippingMethodCoversDestination(
    shippingMethodId: string,
    country: string,
    state: string
  ): Promise<boolean> {
    const config = await shippingRepository.findById(shippingMethodId);
    if (!config || !config.isActive) return false;

    const coversCountry =
      config.countriesCovered.includes('*') ||
      config.countriesCovered.includes('all') ||
      config.countriesCovered.some((c) => c.toLowerCase() === country.toLowerCase());

    const stateRegex = buildStateMatchingRegex(state);
    const coversState =
      config.statesCovered.includes('*') ||
      config.statesCovered.includes('all') ||
      config.statesCovered.some((s) => stateRegex.test(s));

    return coversCountry && coversState;
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

export const checkoutService = new CheckoutService();
