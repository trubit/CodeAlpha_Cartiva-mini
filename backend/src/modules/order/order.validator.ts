/**
 * Cartiva Mini — Order Validation Schemas
 */
import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@shared/enums.js';

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(300, 'Cancellation reason cannot exceed 300 characters.')
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Invalid order status provided.' }),
  }),
  trackingNumber: z.string().trim().optional(),
  carrier: z.string().trim().optional(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters.').optional(),
});

export const orderCustomerFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const orderAdminFilterSchema = z.object({
  orderStatus: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
