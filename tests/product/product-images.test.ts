import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus } from '@shared/enums.js';

describe('Product Image Management (/api/v1/admin/products/:productId/images)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;
  let testProduct: ProductDocument;
  let testCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-images-test';

  // Minimal genuine JPEG binary header (FF D8 FF E0 ...)
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0xff, 0xd9,
  ]);

  // Corrupted / disguised file header
  const fakeJpegBuffer = Buffer.from('GIF89a corrupted disguised payload pretending to be jpeg');

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'ImageMgr',
      email: 'admin.img@cartivamini.test',
      phone: '+2348044556601',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'Viewer',
      email: 'customer.img@cartivamini.test',
      phone: '+2348044556602',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Wristwatches',
      slug: 'wristwatches',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Automatic Chronograph Watch',
      slug: 'automatic-chronograph-watch',
      sku: 'WTC-CHR-001',
      shortDescription: 'Luxury mechanical watch',
      fullDescription: 'Sapphire crystal exhibition caseback with 42 hour power reserve.',
      regularPrice: 320000,
      categoryId: testCategory._id,
      stockQuantity: 12,
      status: ProductStatus.PUBLISHED,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should upload product image with verified JPEG magic bytes and mark first image as thumbnail', async () => {
    const formData = new FormData();
    formData.append(
      'image',
      new Blob([new Uint8Array(validJpegBuffer)], { type: 'image/jpeg' }),
      'watch-main.jpg'
    );
    formData.append('alt', 'Front face of Automatic Chronograph Watch');

    const res = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      }
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.images.length).toBe(1);
    expect(res.body.data.images[0].isThumbnail).toBe(true); // Auto-thumbnail on first image
    expect(res.body.data.images[0].url).toBeDefined();
    expect(res.body.data.images[0].alt).toBe('Front face of Automatic Chronograph Watch');
  });

  it('should reject file upload with disguised MIME type but invalid magic bytes', async () => {
    const formData = new FormData();
    formData.append(
      'image',
      new Blob([new Uint8Array(fakeJpegBuffer)], { type: 'image/jpeg' }),
      'malicious.jpg'
    );

    const res = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      }
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    expect(res.body.error.message).toContain('File content header does not match');
  });

  it('should allow administrator to set an image as primary thumbnail', async () => {
    // Upload 2nd image
    const formData = new FormData();
    formData.append(
      'image',
      new Blob([new Uint8Array(validJpegBuffer)], { type: 'image/jpeg' }),
      'watch-side.jpg'
    );

    const upload2Res = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      }
    );

    expect(upload2Res.status).toBe(200);
    expect(upload2Res.body.data.images.length).toBe(2);
    const secondImageId = upload2Res.body.data.images[1].publicId;

    // Set 2nd image as primary
    const setPrimRes = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images/primary`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { imageId: secondImageId },
      }
    );

    expect(setPrimRes.status).toBe(200);
    expect(setPrimRes.body.success).toBe(true);

    const updatedImages = setPrimRes.body.data.images;
    const secondImg = updatedImages.find(
      (img: { publicId: string }) => img.publicId === secondImageId
    );
    const firstImg = updatedImages.find(
      (img: { publicId: string }) => img.publicId !== secondImageId
    );

    expect(secondImg.isThumbnail).toBe(true);
    expect(firstImg.isThumbnail).toBe(false);
  });

  it('should allow administrator to delete an image from product gallery', async () => {
    const productBefore = await Product.findById(testProduct._id);
    const targetImageId = productBefore!.images[0]!.publicId;

    const delRes = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images/${targetImageId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.images.length).toBe(1);
    expect(
      delRes.body.data.images.some((img: { publicId: string }) => img.publicId === targetImageId)
    ).toBe(false);
  });

  it('should reject non-admin customer or unauthenticated attempts to manage product images', async () => {
    const unauthRes = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images`,
      { method: 'POST' }
    );
    expect(unauthRes.status).toBe(401);

    const customerRes = await testServer.request(
      `/api/v1/admin/products/${testProduct._id.toString()}/images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      }
    );
    expect(customerRes.status).toBe(403);
  });
});
