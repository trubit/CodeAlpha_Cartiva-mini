import { z } from 'zod';

export const updatePlatformSettingsSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  storeDescription: z.string().max(300).optional(),
  contactEmail: z.string().email('Please provide a valid contact email.').optional(),
  contactPhone: z.string().max(30).optional(),
  storeAddress: z.string().max(300).optional(),
  freeShippingThresholdMinor: z.number().int().min(0).optional(),
  lowStockAlertThreshold: z.number().int().min(1).max(100).optional(),
  orderAutoCancellationMinutes: z.number().int().min(5).max(1440).optional(),
  supportEmail: z.string().email('Please provide a valid support email.').optional(),
  policies: z
    .object({
      privacyPolicy: z.string().optional(),
      returnPolicy: z.string().optional(),
      termsOfService: z.string().optional(),
    })
    .optional(),
});
