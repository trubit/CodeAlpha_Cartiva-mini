/**
 * Cartiva Mini — Customer & User Management Constants
 */

export const MAX_USER_ADDRESSES = 10;

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedAvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];

export const EMAIL_CHANGE_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  WEBP_HEADER: [0x57, 0x45, 0x42, 0x50], // "WEBP" at offset 8
} as const;
