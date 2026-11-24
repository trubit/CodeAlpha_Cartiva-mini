import { z } from 'zod';
import { DiscountType } from '@shared/enums.js';

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Coupon code must be at least 3 characters.')
    .max(30, 'Coupon code cannot exceed 30 characters.')
    .regex(/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, dashes, and underscores.')
    .transform((val) => val.toUpperCase().trim()),
  description: z.string().max(200).optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive('Discount value must be greater than zero.'),
  minOrderValue: z.number().min(0, 'Minimum order value cannot be negative.').default(0),
  maxDiscountAmount: z.number().positive('Maximum discount must be positive.').optional(),
  startDate: z.string().datetime({ message: 'Start date must be an ISO 8601 string.' }),
  expiryDate: z.string().datetime({ message: 'Expiry date must be an ISO 8601 string.' }),
  usageLimitTotal: z.number().int().positive().optional(),
  usageLimitPerUser: z.number().int().positive().default(1),
  applicableCategories: z.array(z.string()).optional(),
  applicableProducts: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => new Date(data.expiryDate) > new Date(data.startDate),
  {
    message: 'Expiry date must be strictly after the start date.',
    path: ['expiryDate'],
  }
).refine(
  (data) => {
    if (data.discountType === DiscountType.PERCENTAGE) {
      return data.discountValue <= 100;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%.',
    path: ['discountValue'],
  }
);

export const updateCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/)
    .transform((val) => val.toUpperCase().trim())
    .optional(),
  description: z.string().max(200).optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.number().positive().optional(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscountAmount: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  usageLimitTotal: z.number().int().positive().optional(),
  usageLimitPerUser: z.number().int().positive().optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableProducts: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required.').transform((val) => val.toUpperCase().trim()),
  subtotal: z.number().min(0, 'Subtotal must be non-negative.'),
});
