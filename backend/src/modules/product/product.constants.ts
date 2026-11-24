/**
 * Cartiva Mini — Product & Category Domain Constants
 */

export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PRODUCT_IMAGES = 10;

export const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedProductImageMimeType = (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number];

export const IMAGE_MAGIC_BYTES: Record<AllowedProductImageMimeType, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WEBP check at offset 8)
};

export const PRODUCT_PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const DEFAULT_CURRENCY = 'NGN';
