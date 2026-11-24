import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAGIC_BYTES,
  type AllowedAvatarMimeType,
} from './user.constants.js';

export interface UploadedAvatar {
  url: string;
  storageProvider: 'cloudinary' | 'local_fallback';
  publicId?: string;
}

class StorageService {
  private uploadDir: string;
  private isCloudinaryActive: boolean = false;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'avatars');
    this.ensureUploadDirectory();
    this.evaluateCloudinaryConfig();
  }

  private ensureUploadDirectory(): void {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Failed to create local uploads directory');
    }
  }

  private evaluateCloudinaryConfig(): void {
    const isPlaceholder =
      !env.CLOUDINARY_CLOUD_NAME ||
      env.CLOUDINARY_CLOUD_NAME === 'cartiva_dev_cloud' ||
      env.CLOUDINARY_API_KEY === 'placeholder_api_key' ||
      !env.CLOUDINARY_API_SECRET ||
      env.CLOUDINARY_API_SECRET === 'placeholder_api_secret';

    this.isCloudinaryActive = !isPlaceholder && env.NODE_ENV !== 'test';
    if (this.isCloudinaryActive) {
      logger.info('StorageService initialized with Cloudinary CDN provider.');
    } else {
      logger.info(
        'StorageService initialized with local secure filesystem boundary (dev/test fallback).'
      );
    }
  }

  /**
   * Validates file size, declared MIME type, and binary magic bytes.
   */
  public validateImageBuffer(buffer: Buffer, declaredMimeType: string): AllowedAvatarMimeType {
    if (!buffer || buffer.length === 0) {
      throw AppError.badRequest('No image data received.', ErrorCodes.VALIDATION_ERROR);
    }

    if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
      throw AppError.badRequest(
        `Avatar file size exceeds the 2 MB limit (received ${(buffer.length / 1024 / 1024).toFixed(2)} MB).`,
        ErrorCodes.FILE_TOO_LARGE
      );
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(declaredMimeType as AllowedAvatarMimeType)) {
      throw AppError.badRequest(
        'Invalid file type. Only JPEG, PNG, and WebP images are permitted.',
        ErrorCodes.INVALID_FILE_TYPE
      );
    }

    // Inspect magic numbers to prevent MIME spoofing / executable upload
    const isJpeg =
      buffer[0] === MAGIC_BYTES.JPEG[0] &&
      buffer[1] === MAGIC_BYTES.JPEG[1] &&
      buffer[2] === MAGIC_BYTES.JPEG[2];

    const isPng =
      buffer[0] === MAGIC_BYTES.PNG[0] &&
      buffer[1] === MAGIC_BYTES.PNG[1] &&
      buffer[2] === MAGIC_BYTES.PNG[2] &&
      buffer[3] === MAGIC_BYTES.PNG[3];

    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === MAGIC_BYTES.WEBP_RIFF[0] &&
      buffer[1] === MAGIC_BYTES.WEBP_RIFF[1] &&
      buffer[2] === MAGIC_BYTES.WEBP_RIFF[2] &&
      buffer[3] === MAGIC_BYTES.WEBP_RIFF[3] &&
      buffer[8] === MAGIC_BYTES.WEBP_HEADER[0] &&
      buffer[9] === MAGIC_BYTES.WEBP_HEADER[1] &&
      buffer[10] === MAGIC_BYTES.WEBP_HEADER[2] &&
      buffer[11] === MAGIC_BYTES.WEBP_HEADER[3];

    if (!isJpeg && !isPng && !isWebp) {
      throw AppError.badRequest(
        'File contents do not match a valid image signature. Executable or corrupted files are rejected.',
        ErrorCodes.INVALID_FILE_TYPE
      );
    }

    return declaredMimeType as AllowedAvatarMimeType;
  }

  /**
   * Persists an avatar and returns its secure URL.
   */
  public async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<UploadedAvatar> {
    this.validateImageBuffer(buffer, mimeType);

    const extMap: Record<AllowedAvatarMimeType, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extMap[mimeType as AllowedAvatarMimeType] || 'jpg';
    const timestamp = Date.now();
    const filename = `avatar-${userId}-${timestamp}.${extension}`;

    if (this.isCloudinaryActive) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
        formData.append('file', blob, filename);
        formData.append('folder', 'cartiva/avatars');
        formData.append('public_id', `avatar-${userId}-${timestamp}`);
        formData.append('api_key', env.CLOUDINARY_API_KEY);

        // Generate Cloudinary authentication signature if secret is provided
        const paramsToSign = `folder=cartiva/avatars&public_id=avatar-${userId}-${timestamp}${env.CLOUDINARY_API_SECRET}`;
        const crypto = await import('crypto');
        const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
        formData.append('signature', signature);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (response.ok) {
          const data = (await response.json()) as { secure_url: string; public_id: string };
          return {
            url: data.secure_url,
            publicId: data.public_id,
            storageProvider: 'cloudinary',
          };
        }
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Cloudinary upload failed; falling back to secure local filesystem'
        );
      }
    }

    // Local secure storage fallback (development / test / missing external cloud)
    this.ensureUploadDirectory();
    const targetPath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(targetPath, buffer);

    const publicUrl = `${env.BACKEND_URL}/uploads/avatars/${filename}`;

    return {
      url: publicUrl,
      publicId: filename,
      storageProvider: 'local_fallback',
    };
  }

  /**
   * Safely removes an avatar file when replaced or deleted.
   */
  public async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) return;

    try {
      if (avatarUrl.includes('/uploads/avatars/')) {
        const filename = path.basename(avatarUrl);
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logger.info({ filename }, 'Obsolete local avatar file removed');
        }
      }
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Failed to remove obsolete avatar asset');
    }
  }
}

export const storageService = new StorageService();
