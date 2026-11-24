import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { productRepository } from '../../backend/src/modules/product/product.repository.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole } from '@shared/enums.js';

describe('Product Pricing & Variation Rules (/api/v1/admin/products)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let testCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-pricing-test';

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
      lastName: 'PricingOfficer',
      email: 'admin.pricing@cartivamini.test',
      phone: '+2348033445501',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    testCategory = await Category.create({
      name: 'Apparel & Footwear',
      slug: 'apparel-footwear',
      isActive: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should reject non-positive regular price with 422/400 validation error', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Zero Price Item',
        sku: 'ZER-001',
        shortDescription: 'Free product test',
        fullDescription: 'Testing zero or negative pricing.',
        regularPrice: 0,
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should reject sale price strictly greater than regular price', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Invalid Sale Item',
        sku: 'INV-SAL-001',
        shortDescription: 'Testing invalid sale price',
        fullDescription: 'Sale price is higher than regular price.',
        regularPrice: 20000,
        salePrice: 25000, // Invalid: sale > regular
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toContain(
      'Sale price must be less than or equal to regular price'
    );
  });

  it('should reject negative sale price', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Negative Sale Item',
        sku: 'NEG-SAL-001',
        shortDescription: 'Testing negative sale price',
        fullDescription: 'Negative numbers not allowed.',
        regularPrice: 20000,
        salePrice: -500,
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should reject sale end date earlier than sale start date', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Invalid Date Sale Item',
        sku: 'DAT-SAL-001',
        shortDescription: 'Testing inverted sale dates',
        fullDescription: 'End date is in the past relative to start date.',
        regularPrice: 30000,
        salePrice: 25000,
        saleStartDate: '2026-12-01T00:00:00.000Z',
        saleEndDate: '2026-11-01T00:00:00.000Z', // Before start date
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toContain('Sale end date must be after sale start date');
  });

  it('should support product variations with distinct SKUs, prices, and attributes', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Classic Oxford Cotton Shirt',
        sku: 'OXF-SHT-MAIN',
        shortDescription: 'Pure breathable cotton button-down shirt',
        fullDescription:
          'Tailored fit premium Oxford shirt suitable for business and smart casual.',
        regularPrice: 18000,
        categoryId: testCategory._id.toString(),
        stockQuantity: 40,
        hasVariants: true,
        variants: [
          {
            sku: 'OXF-SHT-BLU-M',
            title: 'Classic Oxford - Blue / Medium',
            price: 18000,
            stockQuantity: 15,
            attributes: { color: 'Sky Blue', size: 'M' },
          },
          {
            sku: 'OXF-SHT-BLU-L',
            title: 'Classic Oxford - Blue / Large',
            price: 19500,
            stockQuantity: 15,
            attributes: { color: 'Sky Blue', size: 'L' },
          },
          {
            sku: 'OXF-SHT-WHT-M',
            title: 'Classic Oxford - White / Medium',
            price: 18000,
            stockQuantity: 10,
            attributes: { color: 'Crisp White', size: 'M' },
          },
        ],
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasVariants).toBe(true);
    expect(res.body.data.variants.length).toBe(3);
    expect(res.body.data.variants[0].sku).toBe('OXF-SHT-BLU-M');
    expect(res.body.data.variants[1].price).toBe(19500);
    expect(res.body.data.variants[2].attributes.color).toBe('Crisp White');
  });

  it('should reject duplicate variant SKUs within the same product creation payload', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Sneakers With Duplicate Variants',
        sku: 'SNK-DUP-001',
        shortDescription: 'Duplicate variant test',
        fullDescription: 'Testing duplicate variant sku check.',
        regularPrice: 35000,
        categoryId: testCategory._id.toString(),
        hasVariants: true,
        variants: [
          {
            sku: 'SNK-VAR-001',
            title: 'Size 42',
            price: 35000,
            stockQuantity: 5,
            attributes: { size: '42' },
          },
          {
            sku: 'SNK-VAR-001', // Duplicate variant SKU!
            title: 'Size 43 with same SKU',
            price: 35000,
            stockQuantity: 5,
            attributes: { size: '43' },
          },
        ],
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('should reject variant SKU if it is already in use by another product in the catalog', async () => {
    // 1. Try creating a new product with a variant SKU that matches an existing product's variant SKU
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Another Oxford Shirt Brand',
        sku: 'OXF-NEW-999',
        shortDescription: 'Another shirt',
        fullDescription: 'Another shirt description.',
        regularPrice: 20000,
        categoryId: testCategory._id.toString(),
        hasVariants: true,
        variants: [
          {
            sku: 'OXF-SHT-BLU-M', // Already used by Classic Oxford Shirt variant!
            title: 'Duplicate variant across products',
            price: 20000,
            stockQuantity: 10,
            attributes: { color: 'Blue' },
          },
        ],
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');

    // 2. Verify that findBySku on the repository correctly resolves the product by variant SKU
    const resolvedProduct = await productRepository.findBySku('OXF-SHT-BLU-M');
    expect(resolvedProduct).not.toBeNull();
    expect(resolvedProduct?.sku).toBe('OXF-SHT-MAIN');
  });
});
