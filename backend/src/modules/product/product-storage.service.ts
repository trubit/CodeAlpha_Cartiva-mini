import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import {
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  IMAGE_MAGIC_BYTES,
  type AllowedProductImageMimeType,
} from './product.constants.js';

export interface UploadedProductImage {
  url: string;
  publicId: string;
  storageProvider: 'cloudinary' | 'local_fallback';
}

class ProductStorageService {
  private uploadDir: string;
  private isCloudinaryActive: boolean = false;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'products');
    this.ensureUploadDirectory();
    this.evaluateCloudinaryConfig();
  }

  private ensureUploadDirectory(): void {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      logger.warn(
        { error: (error as Error).message },
        'Failed to create local product uploads directory'
      );
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
      logger.info('ProductStorageService initialized with Cloudinary CDN provider.');
    } else {
      logger.info(
        'ProductStorageService initialized with local secure filesystem boundary (dev/test fallback).'
      );
    }
  }

  /**
   * Validates file size, declared MIME type, and binary magic bytes.
   */
  public validateImageBuffer(
    buffer: Buffer,
    declaredMimeType: string
  ): AllowedProductImageMimeType {
    if (!buffer || buffer.length === 0) {
      throw AppError.badRequest('No image data received.', ErrorCodes.VALIDATION_ERROR);
    }

    if (buffer.length > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      throw AppError.badRequest(
        `Product image file size exceeds 5 MB limit (received ${(buffer.length / 1024 / 1024).toFixed(2)} MB).`,
        ErrorCodes.FILE_TOO_LARGE
      );
    }

    if (
      !ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(declaredMimeType as AllowedProductImageMimeType)
    ) {
      throw AppError.badRequest(
        `Unsupported media type: '${declaredMimeType}'. Allowed types are: image/jpeg, image/png, image/webp.`,
        ErrorCodes.INVALID_FILE_TYPE
      );
    }

    const verifiedMime = declaredMimeType as AllowedProductImageMimeType;
    this.verifyMagicBytes(buffer, verifiedMime);

    return verifiedMime;
  }

  private verifyMagicBytes(buffer: Buffer, mimeType: AllowedProductImageMimeType): void {
    const signatures = IMAGE_MAGIC_BYTES[mimeType];
    const matchesSignature = signatures.some((sig) => {
      if (buffer.length < sig.length) return false;
      return sig.every((byte, index) => buffer[index] === byte);
    });

    if (!matchesSignature) {
      throw AppError.badRequest(
        'File content header does not match declared MIME signature (file may be corrupted or disguised).',
        ErrorCodes.INVALID_FILE_TYPE
      );
    }

    // Special validation for WebP: offset 8-11 must be 'WEBP'
    if (mimeType === 'image/webp') {
      if (buffer.length < 12) {
        throw AppError.badRequest('Invalid WebP image stream.', ErrorCodes.INVALID_FILE_TYPE);
      }
      const tag = buffer.subarray(8, 12).toString('ascii');
      if (tag !== 'WEBP') {
        throw AppError.badRequest(
          'Corrupted or invalid WebP container tag.',
          ErrorCodes.INVALID_FILE_TYPE
        );
      }
    }
  }

  /**
   * Uploads product image buffer to Cloudinary or secure local filesystem.
   */
  public async uploadProductImage(
    buffer: Buffer,
    declaredMimeType: string,
    productId: string
  ): Promise<UploadedProductImage> {
    const mimeType = this.validateImageBuffer(buffer, declaredMimeType);

    if (this.isCloudinaryActive) {
      try {
        return await this.uploadToCloudinary(buffer, mimeType, productId);
      } catch (cloudErr) {
        logger.warn(
          { error: (cloudErr as Error).message },
          'Cloudinary image upload failed; gracefully falling back to local media storage'
        );
      }
    }

    return this.saveToLocal(buffer, mimeType, productId);
  }

  private async uploadToCloudinary(
    buffer: Buffer,
    mimeType: AllowedProductImageMimeType,
    productId: string
  ): Promise<UploadedProductImage> {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'cartiva/products';
    const publicId = `prod_${productId}_${crypto.randomBytes(6).toString('hex')}`;

    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append('file', blob);
    formData.append('api_key', env.CLOUDINARY_API_KEY || '');
    formData.append('timestamp', timestamp.toString());
    formData.append('public_id', publicId);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(
        { status: response.status, response: errText },
        'Cloudinary image upload failed'
      );
      throw new Error(`Cloudinary upload failed with HTTP ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as { secure_url: string; public_id: string };
    return {
      url: data.secure_url,
      publicId: data.public_id,
      storageProvider: 'cloudinary',
    };
  }

  private async saveToLocal(
    buffer: Buffer,
    mimeType: AllowedProductImageMimeType,
    productId: string
  ): Promise<UploadedProductImage> {
    this.ensureUploadDirectory();

    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const filename = `prod-${productId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/products/${filename}`;
    return {
      url: publicUrl,
      publicId: filename,
      storageProvider: 'local_fallback',
    };
  }

  /**
   * Safely deletes an obsolete product image from disk or Cloudinary.
   */
  public async deleteProductImage(publicId: string, url: string): Promise<void> {
    if (!publicId && !url) return;

    try {
      if (url.startsWith('/uploads/products/')) {
        const filename = path.basename(url);
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } else if (this.isCloudinaryActive && publicId) {
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', env.CLOUDINARY_API_KEY || '');
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);

        await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
          method: 'POST',
          body: formData,
        });
      }
    } catch (error) {
      logger.warn(
        { publicId, url, error: (error as Error).message },
        'Failed to cleanly delete obsolete product image from storage'
      );
    }
  }
}

export const productStorageService = new ProductStorageService();
