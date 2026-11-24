/**
 * Cartiva Mini — Comprehensive Payment & Financial Processing Service
 * Implements Phase 13 payment initiation, authoritative server-side verification,
 * cryptographic webhook handling, atomic inventory deduction, refunds, and reconciliation.
 */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { paymentRepository } from './payment.repository.js';
import { paymentProviderFactory } from './providers/payment-provider.factory.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import {
  PaymentStatus,
  OrderStatus,
  TransactionType,
  RefundStatus,
  UserRole,
  NotificationType,
  NotificationChannel,
} from '@shared/enums.js';
import { notificationService } from '../notifications/notification.service.js';
import { env } from '../../config/env.js';
import type {
  InitializePaymentDto,
  PaymentInitializationResultDto,
  VerifyPaymentResultDto,
  PaymentDetailsDto,
  PaymentListItemDto,
  CreateRefundDto,
  RefundDto,
  PaymentFilterDto,
  ReconciliationResultDto,
  PaginationMeta,
} from '@shared/api.types.js';
import type { RefundFilterInput } from './payment.validator.js';
import type { PaymentDocument, RefundDocument } from '../../models/index.js';

export class PaymentService {
  private readonly supportedCurrencies = new Set(['NGN', 'USD', 'GHS', 'ZAR', 'KES']);

  /**
   * Initializes a payment session for an order awaiting payment.
   */
  public async initializePayment(
    userId: string,
    userEmail: string,
    dto: InitializePaymentDto
  ): Promise<PaymentInitializationResultDto> {
    const order = await paymentRepository.findOrderByNumber(dto.orderNumber);
    if (!order) {
      throw new AppError('Order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    // Strict ownership verification
    if (order.userId.toString() !== userId) {
      throw new AppError(
        'You are not authorized to initiate payment for this order.',
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    // Payment eligibility checks
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppError(
        'This order has already been paid for.',
        400,
        ErrorCodes.ORDER_ALREADY_PAID
      );
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new AppError(
        'Cannot initiate payment for a cancelled order.',
        400,
        ErrorCodes.ORDER_CANCELLED
      );
    }

    if (
      order.orderStatus !== OrderStatus.PENDING_PAYMENT &&
      order.orderStatus !== OrderStatus.CONFIRMED
    ) {
      throw new AppError(
        `Order is not eligible for payment in '${order.orderStatus}' status.`,
        400,
        ErrorCodes.ORDER_NOT_ELIGIBLE_FOR_PAYMENT
      );
    }

    // Authoritative amount and currency check
    const currency = (order.currency || 'NGN').toUpperCase();
    if (!this.supportedCurrencies.has(currency)) {
      throw new AppError(
        `Currency '${currency}' is not currently configured for payment settlement. Please check business merchant settings or use NGN.`,
        400,
        ErrorCodes.BAD_REQUEST
      );
    }

    const orderTotalMinor =
      order.totalAmountMinor !== undefined && order.totalAmountMinor > 0
        ? order.totalAmountMinor
        : Math.round(order.totalAmount * 100);

    const amountMinor = orderTotalMinor > 0 ? orderTotalMinor : Math.round(order.totalAmount * 100);

    if (amountMinor <= 0) {
      throw new AppError('Order payable amount must be greater than zero.', 400, ErrorCodes.BAD_REQUEST);
    }

    // Check for an existing active payment attempt for this order
    const existingPayment = await paymentRepository.findActivePaymentForOrder(order._id);
    if (
      existingPayment &&
      existingPayment.authorizationUrl &&
      existingPayment.status === PaymentStatus.INITIALIZED
    ) {
      // Check with gateway if this existing session was already attempted/failed/abandoned or paid
      try {
        const provider = paymentProviderFactory.getProvider(existingPayment.gateway || 'paystack');
        const check = await provider.verifyPayment(existingPayment.paymentReference);
        if (check.status === 'success') {
          // Already paid on gateway; authoritative verify will complete the order
          await this.verifyPayment(existingPayment.paymentReference);
          throw new AppError('This order has already been paid for.', 400, ErrorCodes.ORDER_ALREADY_PAID);
        } else if (check.status === 'failed' || check.status === 'abandoned') {
          // Gateway recorded a failed or abandoned attempt on this reference.
          // It can never be charged again. Mark as failed and generate a fresh session.
          existingPayment.status =
            check.status === 'failed' ? PaymentStatus.FAILED : PaymentStatus.ABANDONED;
          existingPayment.gatewayResponse = check.rawResponse as Record<string, unknown>;
          await existingPayment.save();
          logger.info(
            { paymentReference: existingPayment.paymentReference, status: existingPayment.status },
            'Previous payment session reached terminal state on gateway; initiating a fresh session.'
          );
        } else {
          // Session is still active and pending with no failed attempt, safe to reuse
          return {
            paymentReference: existingPayment.paymentReference,
            authorizationUrl: existingPayment.authorizationUrl,
            accessCode: existingPayment.accessCode,
            orderNumber: order.orderNumber,
            amount: existingPayment.amount,
            amountMinor: existingPayment.amountMinor ?? Math.round(existingPayment.amount * 100),
            currency: existingPayment.currency,
            gateway: existingPayment.gateway,
          };
        }
      } catch (verifyErr) {
        if (verifyErr instanceof AppError && verifyErr.code === ErrorCodes.ORDER_ALREADY_PAID) {
          throw verifyErr;
        }
        logger.warn(
          { error: (verifyErr as Error).message, paymentReference: existingPayment.paymentReference },
          'Could not reuse existing payment session; marking abandoned and generating fresh payment session.'
        );
        existingPayment.status = PaymentStatus.ABANDONED;
        await existingPayment.save().catch(() => {});
      }
    }

    // Clean and validate customer email for payment provider
    const rawCustomerEmail = (userEmail || order.customerEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitizedEmail = emailRegex.test(rawCustomerEmail)
      ? rawCustomerEmail
      : `${userId.slice(0, 8)}@cartiva.local`;

    // Generate unique payment reference
    const paymentReference = `PAY-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    // Resolve payment provider (Paystack)
    const provider = paymentProviderFactory.getProvider('paystack');

    // Initialize transaction with gateway
    const initResponse = await provider.initializePayment({
      reference: paymentReference,
      amountMinor,
      currency,
      customerEmail: sanitizedEmail,
      customerPhone: order.customerPhone,
      customerName: order.shippingAddress.recipientName,
      callbackUrl: dto.callbackUrl,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId,
      },
    });

    // Create payment record in database
    const payment = await paymentRepository.createPayment({
      paymentReference,
      orderId: order._id,
      userId: new Types.ObjectId(userId),
      customerEmail: sanitizedEmail,
      amount: order.totalAmount,
      amountMinor,
      currency,
      gateway: provider.providerName,
      authorizationUrl: initResponse.authorizationUrl,
      accessCode: initResponse.accessCode,
      status: PaymentStatus.INITIALIZED,
      metadata: {
        orderNumber: order.orderNumber,
        reservationReference: order.reservationReference,
      },
    });

    // Link payment to order and ensure payment status reflects pending state
    order.paymentId = payment._id;
    if (order.paymentStatus !== PaymentStatus.PAID) {
      order.paymentStatus = PaymentStatus.PENDING;
    }
    await order.save();

    logger.info(
      {
        paymentReference,
        orderNumber: order.orderNumber,
        amountMinor,
        currency,
      },
      'Payment initiated successfully with gateway'
    );

    return {
      paymentReference: payment.paymentReference,
      authorizationUrl: initResponse.authorizationUrl,
      accessCode: initResponse.accessCode,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      gateway: payment.gateway,
    };
  }

  /**
   * Performs authoritative server-side payment verification directly against the gateway.
   */
  public async verifyPayment(
    paymentReference: string,
    requestingUserId?: string,
    requestingUserRole?: UserRole
  ): Promise<VerifyPaymentResultDto> {
    const payment = await paymentRepository.findByReference(paymentReference);
    if (!payment) {
      throw new AppError('Payment record not found.', 404, ErrorCodes.NOT_FOUND);
    }

    const order = await paymentRepository.findOrderById(payment.orderId);
    if (!order) {
      throw new AppError('Associated order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    // Ownership check (if not admin)
    if (
      requestingUserId &&
      requestingUserRole !== UserRole.ADMIN &&
      payment.userId.toString() !== requestingUserId
    ) {
      throw new AppError(
        'You do not have permission to view or verify this transaction.',
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    // Idempotency: if already marked paid and confirmed, return existing result immediately
    if (payment.status === PaymentStatus.PAID) {
      return {
        paymentReference: payment.paymentReference,
        orderNumber: order.orderNumber,
        status: PaymentStatus.PAID,
        amount: payment.amount,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        gateway: payment.gateway,
        gatewayTransactionId: payment.gatewayTransactionId,
        channel: payment.channel,
        paidAt: payment.paidAt?.toISOString(),
        verifiedAt: payment.verifiedAt?.toISOString(),
        isOrderConfirmed: order.orderStatus === OrderStatus.CONFIRMED,
        orderStatus: order.orderStatus,
      };
    }

    // Query gateway directly
    const provider = paymentProviderFactory.getProvider(payment.gateway);
    const verification = await provider.verifyPayment(payment.paymentReference);

    if (verification.status === 'success') {
      // Validate amount integrity: Provider amount MUST match internal payment amount
      if (verification.amountMinor !== payment.amountMinor) {
        logger.error(
          {
            expectedMinor: payment.amountMinor,
            receivedMinor: verification.amountMinor,
            reference: payment.paymentReference,
          },
          'Critical financial integrity failure: Payment amount mismatch from gateway'
        );
        payment.status = PaymentStatus.REQUIRES_REVIEW;
        payment.gatewayResponse = verification.rawResponse as Record<string, unknown>;
        await payment.save();

        throw new AppError(
          'Payment verification failed: Settled amount does not match order total.',
          400,
          ErrorCodes.FINANCIAL_INTEGRITY_MISMATCH
        );
      }

      // Validate currency
      if (verification.currency.toUpperCase() !== payment.currency.toUpperCase()) {
        payment.status = PaymentStatus.REQUIRES_REVIEW;
        await payment.save();

        throw new AppError(
          `Payment verification failed: Currency mismatch (${verification.currency} vs ${payment.currency}).`,
          400,
          ErrorCodes.FINANCIAL_INTEGRITY_MISMATCH
        );
      }

      // Atomically update payment to PAID
      payment.status = PaymentStatus.PAID;
      payment.gatewayTransactionId = verification.gatewayTransactionId;
      payment.channel = verification.channel;
      payment.paidAt = verification.paidAt || new Date();
      payment.verifiedAt = new Date();
      payment.ipAddress = verification.ipAddress;
      payment.gatewayResponse = verification.rawResponse as Record<string, unknown>;
      await payment.save();

      // Atomically update order to CONFIRMED
      order.orderStatus = OrderStatus.CONFIRMED;
      order.paymentStatus = PaymentStatus.PAID;
      await order.save();

      // Confirm inventory reservation atomically (deducts on-hand stock and releases hold)
      if (order.reservationReference) {
        try {
          await inventoryService.confirmReservation(
            order.reservationReference,
            order.orderNumber
          );
        } catch (invErr: unknown) {
          logger.warn(
            { invErr, reservationReference: order.reservationReference },
            'Inventory reservation confirmation noted (may have been previously confirmed)'
          );
        }
      }

      // Record transaction ledger entry
      const transactionRef = `TXN-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

      await paymentRepository.createTransaction({
        transactionReference: transactionRef,
        paymentId: payment._id,
        orderId: order._id,
        userId: payment.userId,
        type: TransactionType.CHARGE,
        amount: payment.amount,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        gatewayFee: (verification.gatewayFeeMinor || 0) / 100,
        gatewayFeeMinor: verification.gatewayFeeMinor || 0,
        netAmount: payment.amount - (verification.gatewayFeeMinor || 0) / 100,
        netAmountMinor: payment.amountMinor - (verification.gatewayFeeMinor || 0),
        status: 'successful',
        description: `Charge payment confirmation for order ${order.orderNumber}`,
        timestamp: new Date(),
      });

      // Audit log entry
      await AuditLog.create({
        actorId: payment.userId,
        actorRole: 'customer',
        action: 'PAYMENT_VERIFIED_SUCCESSFUL',
        entity: 'Payment',
        entityId: payment._id.toString(),
        changesDiff: {
          before: { status: PaymentStatus.INITIALIZED },
          after: { status: PaymentStatus.PAID, gatewayTransactionId: verification.gatewayTransactionId },
        },
      });

      logger.info(
        {
          paymentReference: payment.paymentReference,
          orderNumber: order.orderNumber,
          amount: payment.amount,
        },
        'Payment verified and order confirmed successfully'
      );

      // Asynchronously dispatch payment verification notification
      notificationService
        .notify({
          eventType: NotificationType.PAYMENT_SUCCESS,
          recipientId: order.userId.toString(),
          recipientEmail: order.customerEmail,
          title: `Payment Verified — #${order.orderNumber}`,
          message: `Payment of ₦${order.totalAmount.toLocaleString()} verified successfully for order #${order.orderNumber}.`,
          actionUrl: `/account/orders/${order._id.toString()}`,
          templateContext: {
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            paymentReference: payment.paymentReference,
            actionUrl: `${env.FRONTEND_URL}/account/orders/${order._id.toString()}`,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })
        .catch((err) => {
          logger.error(
            { error: (err as Error).message, orderNumber: order.orderNumber },
            'Failed to dispatch payment success notification'
          );
        });
    } else if (verification.status === 'failed') {
      payment.status = PaymentStatus.FAILED;
      payment.gatewayResponse = verification.rawResponse as Record<string, unknown>;
      await payment.save();

      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();

      // Asynchronously dispatch payment failure notification
      notificationService
        .notify({
          eventType: NotificationType.PAYMENT_FAILED,
          recipientId: order.userId.toString(),
          recipientEmail: order.customerEmail,
          title: `Payment Failed — #${order.orderNumber}`,
          message: `Payment could not be verified for order #${order.orderNumber}. You can retry payment to avoid order cancellation.`,
          actionUrl: `/checkout?orderNumber=${order.orderNumber}`,
          templateContext: {
            orderNumber: order.orderNumber,
            actionUrl: `${env.FRONTEND_URL}/checkout?orderNumber=${order.orderNumber}`,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })
        .catch((err) => {
          logger.error(
            { error: (err as Error).message, orderNumber: order.orderNumber },
            'Failed to dispatch payment failure notification'
          );
        });
    } else if (verification.status === 'abandoned') {
      payment.status = PaymentStatus.ABANDONED;
      payment.gatewayResponse = verification.rawResponse as Record<string, unknown>;
      await payment.save();
    }

    return {
      paymentReference: payment.paymentReference,
      orderNumber: order.orderNumber,
      status: payment.status,
      amount: payment.amount,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayTransactionId: payment.gatewayTransactionId,
      channel: payment.channel,
      paidAt: payment.paidAt?.toISOString(),
      verifiedAt: payment.verifiedAt?.toISOString(),
      isOrderConfirmed: order.orderStatus === OrderStatus.CONFIRMED,
      orderStatus: order.orderStatus,
    };
  }

  /**
   * Cryptographically verifies and processes Paystack webhook events with strict replay prevention.
   */
  public async processWebhook(
    rawBody: Buffer,
    signature: string
  ): Promise<{ status: string; processed: boolean; duplicate?: boolean }> {
    const provider = paymentProviderFactory.getProvider('paystack');

    // Cryptographic validation
    const parsed = provider.parseWebhookEvent(rawBody, signature);
    if (!parsed.isValid || !parsed.event) {
      throw new AppError('Invalid webhook signature or payload.', 401, ErrorCodes.UNAUTHORIZED);
    }

    const { event, reference, data } = parsed;
    const eventId = (data?.id ? String(data.id) : undefined) || `${event}_${reference}_${Date.now()}`;

    // Deduplication check
    const existingEvent = await paymentRepository.findWebhookEventById(eventId);
    if (existingEvent && existingEvent.processed) {
      logger.info({ eventId, reference }, 'Duplicate webhook delivery acknowledged idempotently');
      return { status: 'acknowledged', processed: true, duplicate: true };
    }

    // Record webhook entry
    await paymentRepository.recordWebhookEvent({
      eventId,
      event,
      gateway: 'paystack',
      reference: reference || 'N/A',
      payload: data || {},
      signature,
      processed: false,
    });

    try {
      if (event === 'charge.success' && reference) {
        // Authoritative verification and order confirmation
        await this.verifyPayment(reference);
      }

      // Mark webhook as processed
      await paymentRepository.recordWebhookEvent({
        eventId: `${eventId}_done`,
        event,
        gateway: 'paystack',
        reference: reference || 'N/A',
        payload: { processed: true },
        signature,
        processed: true,
        processedAt: new Date(),
      });

      return { status: 'processed', processed: true };
    } catch (err: unknown) {
      logger.error({ err, event, reference }, 'Error executing webhook event logic');
      return { status: 'processed_with_error', processed: false };
    }
  }

  /**
   * Processes a full or partial refund for a paid transaction (Admin only).
   */
  public async processRefund(
    paymentId: string,
    adminId: string,
    dto: CreateRefundDto
  ): Promise<RefundDto> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment record not found.', 404, ErrorCodes.NOT_FOUND);
    }

    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new AppError(
        `Cannot refund payment in '${payment.status}' status. Only paid transactions can be refunded.`,
        400,
        ErrorCodes.BAD_REQUEST
      );
    }

    const order = await paymentRepository.findOrderById(payment.orderId);
    if (!order) {
      throw new AppError('Associated order not found.', 404, ErrorCodes.ORDER_NOT_FOUND);
    }

    // Financial balance calculation
    const currentRefundedMinor = payment.refundedAmountMinor || 0;
    const availableToRefundMinor = payment.amountMinor - currentRefundedMinor;

    if (availableToRefundMinor <= 0) {
      throw new AppError(
        'This payment has already been completely refunded.',
        400,
        ErrorCodes.REFUND_EXCEEDS_BALANCE
      );
    }

    const refundAmountMinor =
      dto.amount !== undefined ? Math.round(dto.amount * 100) : availableToRefundMinor;

    if (refundAmountMinor <= 0) {
      throw new AppError('Refund amount must be greater than zero.', 400, ErrorCodes.BAD_REQUEST);
    }

    if (refundAmountMinor > availableToRefundMinor) {
      throw new AppError(
        `Refund amount (₦${(refundAmountMinor / 100).toFixed(2)}) exceeds available refundable balance (₦${(availableToRefundMinor / 100).toFixed(2)}).`,
        400,
        ErrorCodes.REFUND_EXCEEDS_BALANCE
      );
    }

    const refundReference = `REF-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    // Contact gateway provider
    const provider = paymentProviderFactory.getProvider(payment.gateway);
    const providerRefund = await provider.processRefund({
      transactionReference: payment.paymentReference,
      amountMinor: refundAmountMinor,
      currency: payment.currency,
      customerNote: dto.customerNote,
      merchantNote: dto.merchantNote || dto.reason,
    });

    // Record refund entity
    const refund = await paymentRepository.createRefund({
      refundReference,
      paymentId: payment._id,
      paymentReference: payment.paymentReference,
      orderId: order._id,
      userId: payment.userId,
      initiatedBy: new Types.ObjectId(adminId),
      amount: refundAmountMinor / 100,
      amountMinor: refundAmountMinor,
      currency: payment.currency,
      reason: dto.reason,
      customerNote: dto.customerNote,
      merchantNote: dto.merchantNote,
      status: providerRefund.status === 'processed' ? RefundStatus.COMPLETED : RefundStatus.PENDING,
      gateway: provider.providerName,
      gatewayRefundId: providerRefund.gatewayRefundId,
      gatewayResponse: providerRefund.rawResponse as Record<string, unknown>,
    });

    // Update payment record
    const updatedRefundedTotal = currentRefundedMinor + refundAmountMinor;
    payment.refundedAmountMinor = updatedRefundedTotal;
    payment.status =
      updatedRefundedTotal >= payment.amountMinor
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    await payment.save();

    // Create immutable ledger transaction entry
    const transactionRef = `TXN-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    await paymentRepository.createTransaction({
      transactionReference: transactionRef,
      paymentId: payment._id,
      orderId: order._id,
      userId: payment.userId,
      type: TransactionType.REFUND,
      amount: refundAmountMinor / 100,
      amountMinor: refundAmountMinor,
      currency: payment.currency,
      status: 'successful',
      description: `Refund processing: ${dto.reason}`,
      timestamp: new Date(),
    });

    // Asynchronously dispatch refund update notification
    notificationService
      .notify({
        eventType: NotificationType.REFUND_UPDATE,
        recipientId: payment.userId.toString(),
        recipientEmail: order.customerEmail,
        title: `Refund Processed — #${order.orderNumber}`,
        message: `A refund of ₦${(refundAmountMinor / 100).toLocaleString()} has been processed for order #${order.orderNumber}. Ref: ${refundReference}.`,
        actionUrl: `/account/orders/${order._id.toString()}`,
        templateContext: {
          orderNumber: order.orderNumber,
          refundReference,
          amount: refundAmountMinor / 100,
          actionUrl: `${env.FRONTEND_URL}/account/orders/${order._id.toString()}`,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
      .catch((err) => {
        logger.error(
          { error: (err as Error).message, refundReference },
          'Failed to dispatch refund update notification'
        );
      });

    // Audit log
    await AuditLog.create({
      actorId: new Types.ObjectId(adminId),
      actorRole: 'admin',
      action: 'PAYMENT_REFUND_ISSUED',
      entity: 'Payment',
      entityId: payment._id.toString(),
      changesDiff: {
        refundReference,
        amount: refundAmountMinor / 100,
        reason: dto.reason,
      },
    });

    logger.info(
      {
        refundReference,
        paymentReference: payment.paymentReference,
        amountMinor: refundAmountMinor,
      },
      'Administrative refund successfully processed'
    );

    return {
      id: refund._id.toString(),
      refundReference: refund.refundReference,
      paymentReference: refund.paymentReference,
      orderNumber: order.orderNumber,
      amount: refund.amount,
      amountMinor: refund.amountMinor,
      currency: refund.currency,
      reason: refund.reason,
      customerNote: refund.customerNote,
      status: refund.status,
      gateway: refund.gateway,
      createdAt: refund.createdAt.toISOString(),
    };
  }

  /**
   * Reconciles internal transactions against Paystack provider records.
   */
  public async reconcileTransactions(
    adminId: string,
    specificReference?: string
  ): Promise<ReconciliationResultDto[]> {
    const results: ReconciliationResultDto[] = [];
    const provider = paymentProviderFactory.getProvider('paystack');

    const paymentsToReconcile = specificReference
      ? [await paymentRepository.findByReference(specificReference)].filter(Boolean)
      : await paymentRepository.findPayments({}, 0, 20);

    for (const payment of paymentsToReconcile) {
      if (!payment) continue;
      const order = await paymentRepository.findOrderById(payment.orderId);
      const orderNumber = order ? order.orderNumber : 'UNKNOWN';

      const discrepancies: string[] = [];
      let providerAmountMinor = 0;
      let providerStatus = 'unknown';

      try {
        const provRes = await provider.fetchTransaction(payment.paymentReference);
        providerAmountMinor = provRes.amountMinor;
        providerStatus = provRes.status;

        if (provRes.amountMinor !== payment.amountMinor) {
          discrepancies.push(
            `Amount mismatch: Internal is ${payment.amountMinor} minor, Gateway returned ${provRes.amountMinor} minor`
          );
        }

        if (provRes.currency.toUpperCase() !== payment.currency.toUpperCase()) {
          discrepancies.push(
            `Currency mismatch: Internal is ${payment.currency}, Gateway returned ${provRes.currency}`
          );
        }

        const isStatusAligned =
          (payment.status === PaymentStatus.PAID && provRes.status === 'success') ||
          (payment.status === PaymentStatus.FAILED && provRes.status === 'failed') ||
          (payment.status === PaymentStatus.ABANDONED && provRes.status === 'abandoned') ||
          (payment.status === PaymentStatus.INITIALIZED && provRes.status === 'pending');

        if (!isStatusAligned) {
          discrepancies.push(
            `Status discrepancy: Internal is ${payment.status}, Gateway reports ${provRes.status}`
          );
        }
      } catch (err: unknown) {
        discrepancies.push(`Gateway query error: ${(err as Error).message}`);
      }

      const matched = discrepancies.length === 0;

      // Save reconciliation record
      const reconciliationId = `REC-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      await paymentRepository.createReconciliationRecord({
        reconciliationId,
        paymentReference: payment.paymentReference,
        orderReference: orderNumber,
        internalAmountMinor: payment.amountMinor,
        providerAmountMinor,
        currency: payment.currency,
        internalStatus: payment.status,
        providerStatus,
        matched,
        discrepancies,
        reconciledBy: new Types.ObjectId(adminId),
      });

      results.push({
        paymentReference: payment.paymentReference,
        orderNumber,
        internalAmountMinor: payment.amountMinor,
        providerAmountMinor,
        currency: payment.currency,
        internalStatus: payment.status,
        providerStatus,
        matched,
        discrepancies,
        reconciledAt: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * Retrieves single payment details with refund history.
   */
  public async getPaymentDetails(
    paymentReference: string,
    requestingUserId?: string,
    isAdmin = false
  ): Promise<PaymentDetailsDto> {
    const payment = await paymentRepository.findByReference(paymentReference);
    if (!payment) {
      throw new AppError('Payment record not found.', 404, ErrorCodes.NOT_FOUND);
    }

    if (!isAdmin && requestingUserId && payment.userId.toString() !== requestingUserId) {
      throw new AppError('Access denied.', 403, ErrorCodes.FORBIDDEN);
    }

    const order = await paymentRepository.findOrderById(payment.orderId);
    const orderNumber = order ? order.orderNumber : 'N/A';

    const refunds = await paymentRepository.findRefundsByPaymentId(payment._id);

    return {
      id: payment._id.toString(),
      paymentReference: payment.paymentReference,
      orderId: payment.orderId.toString(),
      orderNumber,
      userId: payment.userId.toString(),
      customerEmail: payment.customerEmail,
      amount: payment.amount,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayTransactionId: payment.gatewayTransactionId,
      authorizationUrl: payment.authorizationUrl,
      channel: payment.channel,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString(),
      verifiedAt: payment.verifiedAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      refunds: refunds.map((r) => this.mapRefundToDto(r, orderNumber)),
    };
  }

  /**
   * Lists payments for a customer with strict ownership scoping.
   */
  public async listCustomerPayments(
    userId: string,
    filter: PaymentFilterDto
  ): Promise<{ payments: PaymentListItemDto[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

    if (filter.status) {
      query.status = filter.status;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      paymentRepository.findPayments(query, skip, limit),
      paymentRepository.countPayments(query),
    ]);

    const mapped = payments.map((p) => this.mapPaymentToListItemDto(p));

    return {
      payments: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Lists administrative payments with full filtering and searching.
   */
  public async listAdminPayments(
    filter: PaymentFilterDto
  ): Promise<{ payments: PaymentListItemDto[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [{ paymentReference: searchRegex }, { customerEmail: searchRegex }];
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filter.endDate);
      }
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      paymentRepository.findPayments(query, skip, limit),
      paymentRepository.countPayments(query),
    ]);

    const mapped = payments.map((p) => this.mapPaymentToListItemDto(p));

    return {
      payments: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Lists refunds with pagination and status filter.
   */
  public async listRefunds(
    filter: RefundFilterInput
  ): Promise<{ refunds: RefundDto[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      paymentRepository.findRefunds(query, skip, limit),
      paymentRepository.countRefunds(query),
    ]);

    const mapped = refunds.map((r) => {
      const order = r.orderId as unknown as { orderNumber?: string };
      return this.mapRefundToDto(r, order?.orderNumber || 'N/A');
    });

    return {
      refunds: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves single refund details.
   */
  public async getRefundDetails(refundId: string): Promise<RefundDto> {
    const refund = await paymentRepository.findRefundByReference(refundId);
    if (!refund) {
      throw new AppError('Refund record not found.', 404, ErrorCodes.NOT_FOUND);
    }
    const order = await paymentRepository.findOrderById(refund.orderId);
    return this.mapRefundToDto(refund, order?.orderNumber || 'N/A');
  }

  private mapPaymentToListItemDto(payment: PaymentDocument): PaymentListItemDto {
    const order = payment.orderId as unknown as { orderNumber?: string };
    return {
      id: payment._id.toString(),
      paymentReference: payment.paymentReference,
      orderNumber: order?.orderNumber || 'N/A',
      customerEmail: payment.customerEmail,
      amount: payment.amount,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      gateway: payment.gateway,
      channel: payment.channel,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private mapRefundToDto(refund: RefundDocument, orderNumber: string): RefundDto {
    return {
      id: refund._id.toString(),
      refundReference: refund.refundReference,
      paymentReference: refund.paymentReference,
      orderNumber,
      amount: refund.amount,
      amountMinor: refund.amountMinor,
      currency: refund.currency,
      reason: refund.reason,
      customerNote: refund.customerNote,
      status: refund.status,
      gateway: refund.gateway,
      createdAt: refund.createdAt.toISOString(),
    };
  }
}

export const paymentService = new PaymentService();
