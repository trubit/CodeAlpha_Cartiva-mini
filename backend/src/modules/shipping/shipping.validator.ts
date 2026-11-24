import { z } from 'zod';
import { ShippingCalculationType } from '@shared/enums.js';

export const shippingAvailabilityQuerySchema = z.object({
  country: z.string().trim().min(2, 'Country must be at least 2 characters.').default('Nigeria'),
  state: z.string().trim().min(2, 'State must be at least 2 characters.'),
});

export const shippingDestinationInputSchema = z.object({
  country: z.string().trim().min(2, 'Country must be at least 2 characters.').default('Nigeria'),
  state: z.string().trim().min(2, 'State or region is required.'),
  city: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const shippingQuoteSchema = z
  .object({
    addressId: z.string().trim().optional(),
    destination: shippingDestinationInputSchema.optional(),
    shippingMethodId: z.string().trim().optional(),
    guestToken: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.addressId || (data.destination && data.destination.state)), {
    message: 'Either an addressId or a destination with state must be provided.',
    path: ['destination'],
  });

export const createShippingConfigSchema = z
  .object({
    zoneName: z
      .string({ required_error: 'Zone name is required.' })
      .trim()
      .min(2, 'Zone name must be at least 2 characters.')
      .max(100, 'Zone name cannot exceed 100 characters.'),
    methodName: z
      .string({ required_error: 'Method name is required.' })
      .trim()
      .min(2, 'Method name must be at least 2 characters.')
      .max(100, 'Method name cannot exceed 100 characters.')
      .default('Standard Delivery'),
    carrierName: z
      .string({ required_error: 'Carrier name is required.' })
      .trim()
      .min(2, 'Carrier name must be at least 2 characters.')
      .max(100, 'Carrier name cannot exceed 100 characters.'),
    description: z.string().trim().max(300, 'Description cannot exceed 300 characters.').optional(),
    rateCalculationType: z
      .nativeEnum(ShippingCalculationType)
      .default(ShippingCalculationType.FLAT),
    baseRate: z
      .number({ required_error: 'Base shipping rate is required.' })
      .min(0, 'Base rate cannot be negative.'),
    ratePerAdditionalKg: z.number().min(0, 'Additional rate per kg cannot be negative.').default(0),
    freeShippingThreshold: z
      .number()
      .min(0, 'Free shipping threshold cannot be negative.')
      .optional(),
    estimatedDeliveryDaysMin: z
      .number({ required_error: 'Minimum delivery days is required.' })
      .int('Minimum delivery days must be an integer.')
      .min(0, 'Minimum delivery days cannot be negative.'),
    estimatedDeliveryDaysMax: z
      .number({ required_error: 'Maximum delivery days is required.' })
      .int('Maximum delivery days must be an integer.')
      .min(0, 'Maximum delivery days cannot be negative.'),
    countriesCovered: z.array(z.string().trim()).default(['Nigeria']),
    statesCovered: z
      .array(z.string().trim())
      .min(1, 'At least one state or territory must be covered.'),
    currency: z.string().trim().max(10).default('NGN'),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.estimatedDeliveryDaysMax >= data.estimatedDeliveryDaysMin, {
    message: 'Maximum delivery days must be greater than or equal to minimum delivery days.',
    path: ['estimatedDeliveryDaysMax'],
  });

export const updateShippingConfigSchema = z
  .object({
    zoneName: z.string().trim().min(2).max(100).optional(),
    methodName: z.string().trim().min(2).max(100).optional(),
    carrierName: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(300).optional(),
    rateCalculationType: z.nativeEnum(ShippingCalculationType).optional(),
    baseRate: z.number().min(0).optional(),
    ratePerAdditionalKg: z.number().min(0).optional(),
    freeShippingThreshold: z.number().min(0).optional().nullable(),
    estimatedDeliveryDaysMin: z.number().int().min(0).optional(),
    estimatedDeliveryDaysMax: z.number().int().min(0).optional(),
    countriesCovered: z.array(z.string().trim()).optional(),
    statesCovered: z.array(z.string().trim()).min(1).optional(),
    currency: z.string().trim().max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (
        data.estimatedDeliveryDaysMin !== undefined &&
        data.estimatedDeliveryDaysMax !== undefined
      ) {
        return data.estimatedDeliveryDaysMax >= data.estimatedDeliveryDaysMin;
      }
      return true;
    },
    {
      message: 'Maximum delivery days must be greater than or equal to minimum delivery days.',
      path: ['estimatedDeliveryDaysMax'],
    }
  );

export const shippingConfigFilterSchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  search: z.string().trim().optional(),
});
