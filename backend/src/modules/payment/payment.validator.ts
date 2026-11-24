/**
 * Cartiva Mini — Payment Request Validation Schemas
 * Strict Zod validation for payment initialization, verification, refunds, and queries.
 */
import { z } from 'zod';
import { PaymentStatus, RefundStatus } from '@shared/enums.js';

export const initializePaymentSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(3, 'Order number must be at least 3 characters.')
    .max(50, 'Order number is too long.'),
  callbackUrl: z
    .string()
    .url('Callback URL must be a valid HTTP(S) URL.')
    .optional(),
});

export const verifyPaymentParamsSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(3, 'Payment reference must be at least 3 characters.')
    .max(100, 'Payment reference is too long.'),
});

export const createRefundSchema = z.object({
  amount: z
    .number()
    .positive('Refund amount must be strictly greater than zero.')
    .optional(),
  reason: z
    .string()
    .trim()
    .min(3, 'Refund reason is required and must be at least 3 characters.')
    .max(500, 'Refund reason cannot exceed 500 characters.'),
  customerNote: z.string().trim().max(500).optional(),
  merchantNote: z.string().trim().max(500).optional(),
});

export const paymentFilterSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const refundFilterSchema = z.object({
  status: z.nativeEnum(RefundStatus).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentParamsInput = z.infer<typeof verifyPaymentParamsSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;
export type RefundFilterInput = z.infer<typeof refundFilterSchema>;
