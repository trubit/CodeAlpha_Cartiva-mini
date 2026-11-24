/**
 * Cartiva Mini — Administrator Payment Management Controller
 * Administrative operations for transactions, refunds, and financial reconciliation.
 */
import type { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import {
  paymentFilterSchema,
  createRefundSchema,
  refundFilterSchema,
} from './payment.validator.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';

export class AdminPaymentController {
  /**
   * GET /api/v1/admin/payments
   * Lists all transactions across all customers with administrative filtering.
   */
  public async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = paymentFilterSchema.parse(req.query);
      const { payments, meta } = await paymentService.listAdminPayments(filter);
      sendSuccess(res, payments, 'Administrator payments retrieved successfully.', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/payments/:reference
   * Retrieves single payment details with full order snapshot and refund ledger.
   */
  public async getPaymentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;
      if (!reference) {
        throw new AppError('Payment reference is required.', 400, ErrorCodes.BAD_REQUEST);
      }
      const payment = await paymentService.getPaymentDetails(reference, undefined, true);
      sendSuccess(res, payment, 'Payment details retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/payments/:paymentId/refunds
   * Issues an authorized full or partial refund via Paystack.
   */
  public async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }
      const { paymentId } = req.params;
      if (!paymentId) {
        throw new AppError('Payment ID is required.', 400, ErrorCodes.BAD_REQUEST);
      }

      const input = createRefundSchema.parse(req.body);
      const refund = await paymentService.processRefund(paymentId, req.user.id, input);
      sendSuccess(res, refund, 'Refund successfully issued.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/refunds
   * Lists historical refund records.
   */
  public async listRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = refundFilterSchema.parse(req.query);
      const { refunds, meta } = await paymentService.listRefunds(filter);
      sendSuccess(res, refunds, 'Refunds retrieved successfully.', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/refunds/:refundId
   * Retrieves details of a specific refund.
   */
  public async getRefundDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refundId } = req.params;
      if (!refundId) {
        throw new AppError('Refund reference is required.', 400, ErrorCodes.BAD_REQUEST);
      }
      const refund = await paymentService.getRefundDetails(refundId);
      sendSuccess(res, refund, 'Refund details retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/payments/reconciliation
   * Runs financial reconciliation comparing internal ledger entries against Paystack.
   */
  public async runReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }
      const reference = req.query.reference as string | undefined;
      const results = await paymentService.reconcileTransactions(req.user.id, reference);
      sendSuccess(res, results, 'Financial reconciliation completed.');
    } catch (err) {
      next(err);
    }
  }
}

export const adminPaymentController = new AdminPaymentController();
