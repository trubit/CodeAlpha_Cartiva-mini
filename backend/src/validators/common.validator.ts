import { z } from 'zod';

/**
 * Common Pagination & Sorting Query Schema.
 * Reusable across future collection listing endpoints (products, orders, reviews).
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Common MongoDB ObjectId Route Parameter Schema.
 * Validates 24-character hexadecimal IDs before hitting controllers.
 */
export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal identifier format.'),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type ObjectIdParamInput = z.infer<typeof objectIdParamSchema>;
