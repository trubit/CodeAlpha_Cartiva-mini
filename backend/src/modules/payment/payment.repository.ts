/**
 * Cartiva Mini — Payment Repository Layer
 * Manages atomic data access and persistence for Payments, Transactions, Refunds,
 * Webhooks, and Reconciliation records.
 */
import { Types, type FilterQuery, type UpdateQuery } from 'mongoose';
import {
  Payment,
  type PaymentDocument,
  Transaction,
  type TransactionDocument,
  Refund,
  type RefundDocument,
  WebhookEvent,
  type WebhookEventDocument,
  ReconciliationRecord,
  type ReconciliationRecordDocument,
  Order,
  type OrderDocument,
} from '../../models/index.js';
import { PaymentStatus } from '@shared/enums.js';

export class PaymentRepository {
  /**
   * Finds a payment record by its unique reference string.
   */
  public async findByReference(paymentReference: string): Promise<PaymentDocument | null> {
    return Payment.findOne({ paymentReference: paymentReference.toUpperCase().trim() }).exec();
  }

  /**
   * Finds a payment record by its internal ObjectId.
   */
  public async findById(id: string | Types.ObjectId): Promise<PaymentDocument | null> {
    return Payment.findById(id).exec();
  }

  /**
   * Finds the latest active payment attempt for a given order.
   */
  public async findActivePaymentForOrder(
    orderId: string | Types.ObjectId
  ): Promise<PaymentDocument | null> {
    return Payment.findOne({
      orderId,
      status: {
        $in: [PaymentStatus.INITIALIZED, PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Finds any payment record for an order.
   */
  public async findLatestPaymentForOrder(
    orderId: string | Types.ObjectId
  ): Promise<PaymentDocument | null> {
    return Payment.findOne({ orderId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Creates a new pending/initialized payment record.
   */
  public async createPayment(data: {
    paymentReference: string;
    orderId: Types.ObjectId;
    userId: Types.ObjectId;
    customerEmail: string;
    amount: number;
    amountMinor: number;
    currency: string;
    gateway: string;
    authorizationUrl?: string;
    accessCode?: string;
    status: PaymentStatus;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentDocument> {
    const payment = new Payment(data);
    return payment.save();
  }

  /**
   * Updates an existing payment record.
   */
  public async updatePayment(
    id: string | Types.ObjectId,
    update: UpdateQuery<PaymentDocument>
  ): Promise<PaymentDocument | null> {
    return Payment.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Queries paginated payment records with filtering.
   */
  public async findPayments(
    filter: FilterQuery<PaymentDocument>,
    skip: number,
    limit: number
  ): Promise<PaymentDocument[]> {
    return Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'orderNumber totalAmount totalAmountMinor orderStatus')
      .exec();
  }

  /**
   * Counts payments matching filter criteria.
   */
  public async countPayments(filter: FilterQuery<PaymentDocument>): Promise<number> {
    return Payment.countDocuments(filter).exec();
  }

  /**
   * Retrieves an Order by its unique order number.
   */
  public async findOrderByNumber(orderNumber: string): Promise<OrderDocument | null> {
    return Order.findOne({ orderNumber: orderNumber.toUpperCase().trim() }).exec();
  }

  /**
   * Retrieves an Order by its ObjectId.
   */
  public async findOrderById(orderId: string | Types.ObjectId): Promise<OrderDocument | null> {
    return Order.findById(orderId).exec();
  }

  /**
   * Creates an immutable transaction ledger record.
   */
  public async createTransaction(
    data: Partial<TransactionDocument> & {
      transactionReference: string;
      amount: number;
      amountMinor: number;
      currency: string;
      type: import('@shared/enums.js').TransactionType;
    }
  ): Promise<TransactionDocument> {
    const transaction = new Transaction(data);
    return transaction.save();
  }

  /**
   * Retrieves transaction ledger entries for a given payment.
   */
  public async findTransactionsByPaymentId(
    paymentId: string | Types.ObjectId
  ): Promise<TransactionDocument[]> {
    return Transaction.find({ paymentId }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Creates a refund record.
   */
  public async createRefund(
    data: Partial<RefundDocument> & {
      refundReference: string;
      paymentId: Types.ObjectId;
      paymentReference: string;
      orderId: Types.ObjectId;
      userId: Types.ObjectId;
      initiatedBy: Types.ObjectId;
      amount: number;
      amountMinor: number;
      currency: string;
      reason: string;
      status: import('@shared/enums.js').RefundStatus;
    }
  ): Promise<RefundDocument> {
    const refund = new Refund(data);
    return refund.save();
  }

  /**
   * Retrieves a refund record by reference.
   */
  public async findRefundByReference(refundReference: string): Promise<RefundDocument | null> {
    return Refund.findOne({ refundReference: refundReference.toUpperCase().trim() }).exec();
  }

  /**
   * Retrieves all refund records for a payment.
   */
  public async findRefundsByPaymentId(
    paymentId: string | Types.ObjectId
  ): Promise<RefundDocument[]> {
    return Refund.find({ paymentId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Queries paginated refunds with filtering.
   */
  public async findRefunds(
    filter: FilterQuery<RefundDocument>,
    skip: number,
    limit: number
  ): Promise<RefundDocument[]> {
    return Refund.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'orderNumber totalAmount')
      .populate('initiatedBy', 'email firstName lastName')
      .exec();
  }

  /**
   * Counts refunds matching filter criteria.
   */
  public async countRefunds(filter: FilterQuery<RefundDocument>): Promise<number> {
    return Refund.countDocuments(filter).exec();
  }

  /**
   * Records an incoming webhook event for idempotency deduplication.
   */
  public async recordWebhookEvent(data: {
    eventId: string;
    event: string;
    gateway: string;
    reference: string;
    payload: Record<string, unknown>;
    signature: string;
    processed?: boolean;
    processedAt?: Date;
    error?: string;
  }): Promise<WebhookEventDocument> {
    const event = new WebhookEvent(data);
    return event.save();
  }

  /**
   * Checks if a webhook event with the given eventId has already been recorded or processed.
   */
  public async findWebhookEventById(eventId: string): Promise<WebhookEventDocument | null> {
    return WebhookEvent.findOne({ eventId }).exec();
  }

  /**
   * Checks if a webhook event has already been recorded for a specific transaction reference and event type.
   */
  public async findWebhookEventByReferenceAndEvent(
    reference: string,
    event: string
  ): Promise<WebhookEventDocument | null> {
    return WebhookEvent.findOne({ reference, event }).exec();
  }

  /**
   * Creates a financial reconciliation log record.
   */
  public async createReconciliationRecord(data: {
    reconciliationId: string;
    paymentReference: string;
    orderReference: string;
    internalAmountMinor: number;
    providerAmountMinor: number;
    currency: string;
    internalStatus: string;
    providerStatus: string;
    matched: boolean;
    discrepancies: string[];
    reconciledBy: Types.ObjectId;
  }): Promise<ReconciliationRecordDocument> {
    const record = new ReconciliationRecord(data);
    return record.save();
  }

  /**
   * Queries recent reconciliation records.
   */
  public async findRecentReconciliations(limit = 50): Promise<ReconciliationRecordDocument[]> {
    return ReconciliationRecord.find()
      .sort({ reconciledAt: -1 })
      .limit(limit)
      .populate('reconciledBy', 'email firstName lastName')
      .exec();
  }
}

export const paymentRepository = new PaymentRepository();
