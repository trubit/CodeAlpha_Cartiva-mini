import { z } from 'zod';
import { ReviewStatus } from '@shared/enums.js';

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int('Rating must be an integer.')
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating cannot exceed 5 stars.'),
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters.')
    .max(100, 'Title cannot exceed 100 characters.')
    .trim(),
  comment: z
    .string()
    .min(5, 'Comment must be at least 5 characters.')
    .max(1500, 'Comment cannot exceed 1500 characters.')
    .trim(),
  images: z.array(z.string().url('Image must be a valid URL.')).optional().default([]),
  orderId: z.string().optional(),
});

export const updateReviewStatusSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  moderationReason: z.string().max(300).optional(),
});
