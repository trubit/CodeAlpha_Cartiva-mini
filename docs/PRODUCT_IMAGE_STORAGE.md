# Cartiva Mini — Product Image Storage Architecture

## 1. Overview

Product media in Cartiva Mini is managed through `ProductStorageService` (`backend/src/modules/product/product-storage.service.ts`). The architecture enforces high security standards against image tampering, strict MIME/magic-byte validation, and automated fallback handling between Cloudinary cloud storage and local encrypted file paths.

---

## 2. Multi-Tier Security Validation

1. **Max File Size:** Capped at 5MB (`MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024`). Requests exceeding 5MB are rejected early by Multer with HTTP 413.
2. **Declared MIME Types:** Only `image/jpeg`, `image/png`, `image/webp` are permitted.
3. **Magic-Byte Header Inspection:**
   To prevent extension spoofing (e.g. uploading an executable renamed as `.jpg`), the buffer's binary header is inspected:
   - **JPEG:** `FF D8 FF`
   - **PNG:** `89 50 4E 47 0D 0A 1A 0A`
   - **WebP:** `52 49 46 46` ... `57 45 42 50`
     Any mismatch between declared MIME type and actual magic bytes triggers HTTP 400 `INVALID_FILE_TYPE`.

---

## 3. Storage Provider Integration

### Cloudinary (Production Mode)

When environment variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are configured:

- Images are signed and uploaded directly via Cloudinary REST API (`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`).
- Stored in folder: `cartiva/products/${productId}`.
- Deletions are securely routed to the Cloudinary Admin destruction endpoint.

### Local Secure Filesystem Fallback (Development & Testing)

When Cloudinary credentials are absent:

- Files are saved to `uploads/products/`.
- File naming format: `prod-${productId}-${timestamp}-${randomHex}.${extension}`.
- Deletions delete the physical file from the disk to prevent disk accumulation.
- The boundary interface is identical so zero code changes are required when switching providers.

---

## 4. Gallery & Thumbnail Lifecycle Rules

1. **First Image Auto-Promotion:** When the first image is added to a product with an empty gallery, it is automatically marked as `isThumbnail: true`.
2. **Explicit Thumbnail Assignment:** When an image is set as primary via `/primary`, all other images in the gallery have `isThumbnail` set to `false`.
3. **Thumbnail Auto-Recovery on Deletion:** If the primary thumbnail is deleted, the system automatically promotes the next remaining image in the gallery to `isThumbnail: true`.
4. **Gallery Limit:** A maximum of 10 images per product is enforced (`MAX_PRODUCT_IMAGES = 10`).
