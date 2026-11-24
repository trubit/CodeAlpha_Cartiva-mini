/**
 * Cartiva Mini — Customer Payment Controller
 * Handles customer-facing payment initiation, server-side verification, and payment queries.
 */
import type { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import {
  initializePaymentSchema,
  verifyPaymentParamsSchema,
  paymentFilterSchema,
} from './payment.validator.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { UserRole } from '@shared/enums.js';

export class PaymentController {
  /**
   * POST /api/v1/payments/initialize
   * Customer initiates a gateway transaction session for a pending order.
   */
  public async initializePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      const input = initializePaymentSchema.parse(req.body);
      const result = await paymentService.initializePayment(
        req.user.id,
        req.user.email,
        input
      );

      sendSuccess(res, result, 'Payment initialized successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:reference/verify
   * Authoritatively verifies transaction status against Paystack.
   */
  public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = verifyPaymentParamsSchema.parse(req.params);
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole | undefined;

      const result = await paymentService.verifyPayment(reference, userId, userRole);
      sendSuccess(res, result, 'Payment status verified successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:reference
   * Retrieves single payment transaction details for a customer.
   */
  public async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      const { reference } = verifyPaymentParamsSchema.parse(req.params);
      const isAdmin = req.user.role === UserRole.ADMIN;
      const result = await paymentService.getPaymentDetails(reference, req.user.id, isAdmin);

      sendSuccess(res, result, 'Payment details retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments
   * Lists customer's own payment transaction records.
   */
  public async listMyPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      const filter = paymentFilterSchema.parse(req.query);
      const { payments, meta } = await paymentService.listCustomerPayments(req.user.id, filter);

      sendSuccess(res, payments, 'Payments retrieved successfully.', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/payments/:reference/retry
   * Safely retries a failed or abandoned payment for an eligible order.
   */
  public async retryPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      const { reference } = verifyPaymentParamsSchema.parse(req.params);
      const payment = await paymentService.getPaymentDetails(reference, req.user.id, false);

      const result = await paymentService.initializePayment(req.user.id, req.user.email, {
        orderNumber: payment.orderNumber,
      });

      sendSuccess(res, result, 'Payment session re-initialized.', 201);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
