/**
 * Cartiva Mini — Checkout Request Validation Schemas
 */
import { z } from 'zod';
import { CHECKOUT_CONSTANTS } from './checkout.constants.js';

export const checkoutSetAddressSchema = z.object({
  addressId: z
    .string({ required_error: 'Delivery address ID is required.' })
    .trim()
    .min(1, 'Delivery address ID cannot be empty.')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid delivery address ID format.'),
});

export const checkoutSetShippingSchema = z.object({
  shippingMethodId: z
    .string({ required_error: 'Shipping method ID is required.' })
    .trim()
    .min(1, 'Shipping method ID cannot be empty.')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid shipping method ID format.'),
});

export const checkoutConfirmSchema = z.object({
  acceptTerms: z.preprocess(
    (val) => val === true || val === 'true' || val === 1 || val === '1',
    z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions to proceed.' }),
    })
  ),
  customerNotes: z
    .string()
    .trim()
    .max(
      CHECKOUT_CONSTANTS.MAX_CUSTOMER_NOTES_LENGTH,
      `Notes cannot exceed ${CHECKOUT_CONSTANTS.MAX_CUSTOMER_NOTES_LENGTH} characters.`
    )
    .optional(),
  idempotencyKey: z.string().trim().optional(),
});
