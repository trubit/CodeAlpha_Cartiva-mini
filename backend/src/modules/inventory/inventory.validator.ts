import { z } from 'zod';
import { InventoryStatus, InventoryMovementType } from '@shared/enums.js';
import { INVENTORY_CONSTANTS } from './inventory.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const initializeInventorySchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Initial stock quantity is required.' })
    .int('Stock quantity must be an integer.')
    .min(0, 'Stock quantity cannot be negative.')
    .max(
      INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY,
      `Stock quantity cannot exceed ${INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY}.`
    ),
  lowStockThreshold: z.coerce
    .number()
    .int('Low stock threshold must be an integer.')
    .min(0, 'Threshold cannot be negative.')
    .max(INVENTORY_CONSTANTS.MAX_THRESHOLD)
    .optional(),
  reason: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().trim().min(4).max(100).optional(),
});

export const receiveStockSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Received quantity is required.' })
    .int('Received quantity must be an integer.')
    .min(1, 'Received quantity must be at least 1.')
    .max(
      INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY,
      `Quantity cannot exceed ${INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY}.`
    ),
  reason: z
    .string({ required_error: 'Audit reason is required for receiving stock.' })
    .trim()
    .min(3, 'Reason must be at least 3 characters.')
    .max(300, 'Reason cannot exceed 300 characters.'),
  referenceId: z.string().trim().max(100).optional(),
  idempotencyKey: z.string().trim().min(4).max(100).optional(),
});

export const deductStockSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Deduction quantity is required.' })
    .int('Deduction quantity must be an integer.')
    .min(1, 'Deduction quantity must be at least 1.')
    .max(
      INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY,
      `Quantity cannot exceed ${INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY}.`
    ),
  reason: z
    .string({ required_error: 'Audit reason is required for stock deduction.' })
    .trim()
    .min(3, 'Reason must be at least 3 characters.')
    .max(300, 'Reason cannot exceed 300 characters.'),
  movementType: z.nativeEnum(InventoryMovementType).optional(),
  referenceId: z.string().trim().max(100).optional(),
  idempotencyKey: z.string().trim().min(4).max(100).optional(),
});

export const adjustStockSchema = z.object({
  targetQuantity: z.coerce
    .number({ required_error: 'Target stock quantity is required.' })
    .int('Target quantity must be an integer.')
    .min(0, 'Target quantity cannot be negative.')
    .max(
      INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY,
      `Target quantity cannot exceed ${INVENTORY_CONSTANTS.MAX_ADJUSTMENT_QUANTITY}.`
    ),
  reason: z
    .string({ required_error: 'Audit reason is required for manual stock adjustment.' })
    .trim()
    .min(3, 'Reason must be at least 3 characters.')
    .max(300, 'Reason cannot exceed 300 characters.'),
  referenceId: z.string().trim().max(100).optional(),
  idempotencyKey: z.string().trim().min(4).max(100).optional(),
});

export const updateThresholdSchema = z.object({
  lowStockThreshold: z.coerce
    .number({ required_error: 'Low stock threshold is required.' })
    .int('Low stock threshold must be an integer.')
    .min(0, 'Threshold cannot be negative.')
    .max(
      INVENTORY_CONSTANTS.MAX_THRESHOLD,
      `Threshold cannot exceed ${INVENTORY_CONSTANTS.MAX_THRESHOLD}.`
    ),
});

export const reservationItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required.' })
    .trim()
    .regex(objectIdRegex, 'Product ID must be a valid 24-character hexadecimal ObjectId.'),
  variantId: z
    .string()
    .trim()
    .regex(objectIdRegex, 'Variant ID must be a valid 24-character hexadecimal ObjectId.')
    .optional(),
  sku: z.string({ required_error: 'SKU is required.' }).trim().min(2).max(50).toUpperCase(),
  quantity: z.coerce
    .number({ required_error: 'Reserved quantity is required.' })
    .int('Reserved quantity must be an integer.')
    .min(1, 'Reserved quantity must be at least 1.')
    .max(1000, 'Single item reservation cannot exceed 1000 units.'),
});

export const createReservationSchema = z.object({
  items: z
    .array(reservationItemSchema, {
      required_error: 'Reservation items array is required.',
    })
    .min(1, 'A reservation must contain at least one item.'),
  expiresInMinutes: z.coerce
    .number()
    .int()
    .min(INVENTORY_CONSTANTS.MIN_RESERVATION_TTL_MINUTES)
    .max(INVENTORY_CONSTANTS.MAX_RESERVATION_TTL_MINUTES)
    .default(INVENTORY_CONSTANTS.DEFAULT_RESERVATION_TTL_MINUTES)
    .optional(),
  idempotencyKey: z.string().trim().min(4).max(100).optional(),
  referenceType: z.enum(['cart', 'checkout', 'order', 'manual']).default('cart').optional(),
  referenceId: z.string().trim().max(100).optional(),
});

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_CONSTANTS.MAX_LIMIT)
    .default(INVENTORY_CONSTANTS.DEFAULT_LIMIT)
    .optional(),
  search: z.string().trim().optional(),
  sku: z.string().trim().toUpperCase().optional(),
  status: z.nativeEnum(InventoryStatus).optional(),
  lowStockOnly: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  outOfStockOnly: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  categoryId: z.string().trim().regex(objectIdRegex).optional(),
});

export const movementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_CONSTANTS.MAX_LIMIT)
    .default(INVENTORY_CONSTANTS.DEFAULT_LIMIT)
    .optional(),
  productId: z.string().trim().regex(objectIdRegex).optional(),
  variantId: z.string().trim().regex(objectIdRegex).optional(),
  sku: z.string().trim().toUpperCase().optional(),
  movementType: z.nativeEnum(InventoryMovementType).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
});
