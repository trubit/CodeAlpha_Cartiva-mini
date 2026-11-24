/**
 * Cartiva Mini — Cart & Wishlist Request Validators
 */
import { z } from 'zod';
import { CART_CONSTANTS } from './cart.constants.js';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const addItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product identifier is required.' })
    .regex(mongoIdRegex, 'Invalid Product ID format.'),
  variantId: z.string().regex(mongoIdRegex, 'Invalid Variant ID format.').optional(),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int('Quantity must be an integer.')
    .min(
      CART_CONSTANTS.MIN_QUANTITY_PER_ITEM,
      `Quantity must be at least ${CART_CONSTANTS.MIN_QUANTITY_PER_ITEM}.`
    )
    .max(
      CART_CONSTANTS.MAX_QUANTITY_PER_ITEM,
      `Quantity cannot exceed ${CART_CONSTANTS.MAX_QUANTITY_PER_ITEM}.`
    )
    .default(CART_CONSTANTS.DEFAULT_QUANTITY),
});

export const updateQuantitySchema = z.object({
  quantity: z.coerce
    .number({
      required_error: 'Quantity is required.',
      invalid_type_error: 'Quantity must be a number.',
    })
    .int('Quantity must be an integer.')
    .min(
      CART_CONSTANTS.MIN_QUANTITY_PER_ITEM,
      `Quantity must be at least ${CART_CONSTANTS.MIN_QUANTITY_PER_ITEM}.`
    )
    .max(
      CART_CONSTANTS.MAX_QUANTITY_PER_ITEM,
      `Quantity cannot exceed ${CART_CONSTANTS.MAX_QUANTITY_PER_ITEM}.`
    ),
});

export const mergeCartSchema = z.object({
  guestCartToken: z.string().min(1).max(128).optional(),
});

export const itemIdParamSchema = z.object({
  itemId: z
    .string({ required_error: 'Item identifier is required.' })
    .min(1, 'Item ID cannot be empty.'),
});

export const addWishlistItemSchema = z.object({
  productId: z
    .string({ required_error: 'Product identifier is required.' })
    .regex(mongoIdRegex, 'Invalid Product ID format.'),
});

export const moveWishlistItemSchema = z.object({
  variantId: z.string().regex(mongoIdRegex, 'Invalid Variant ID format.').optional(),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer.')
    .min(CART_CONSTANTS.MIN_QUANTITY_PER_ITEM)
    .max(CART_CONSTANTS.MAX_QUANTITY_PER_ITEM)
    .default(CART_CONSTANTS.DEFAULT_QUANTITY)
    .optional(),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;
export type MoveWishlistItemInput = z.infer<typeof moveWishlistItemSchema>;
