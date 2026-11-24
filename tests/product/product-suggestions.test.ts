import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus } from '@shared/enums.js';

describe('Search Suggestions & Autocomplete (/api/v1/products/suggestions)', () => {
  let testServer: TestServer;
  let testCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-suggestions-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await Category.deleteMany({});
    await Product.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    testCategory = await Category.create({
      name: 'Smartphones & Mobile Devices',
      slug: 'smartphones-mobile-devices-sugg',
      isActive: true,
    });

    await Category.create({
      name: 'Smart Home Automation (Inactive)',
      slug: 'smart-home-inactive-sugg',
      isActive: false, // Inactive: must never be returned in suggestions
    });

    await Product.create([
      {
        title: 'Samsung Galaxy S24 Ultra Titanium Black',
        slug: 'samsung-galaxy-s24-ultra-sugg',
        sku: 'SAM-S24U-BLK',
        brand: 'Samsung',
        shortDescription: 'Galaxy AI powered smartphone.',
        fullDescription: 'Titanium frame with integrated S-Pen stylus.',
        regularPrice: 1250000,
        salePrice: 1190000,
        costPrice: 900000,
        categoryId: testCategory._id,
        stockQuantity: 10,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Samsung Galaxy A55 5G Awesome Navy',
        slug: 'samsung-galaxy-a55-sugg',
        sku: 'SAM-A55-NAV',
        brand: 'Samsung',
        shortDescription: 'Metal frame with Super AMOLED display.',
        fullDescription: 'Mid-range champion with 50MP camera.',
        regularPrice: 380000,
        costPrice: 280000,
        categoryId: testCategory._id,
        stockQuantity: 20,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Samsung Galaxy SmartTag2 Bluetooth Tracker',
        slug: 'samsung-galaxy-smarttag2-sugg',
        sku: 'SAM-TAG-002',
        brand: 'Samsung',
        shortDescription: 'Compass view compact tracker.',
        fullDescription: 'Water-resistant tracker with 500-day battery life.',
        regularPrice: 25000,
        costPrice: 15000,
        categoryId: testCategory._id,
        stockQuantity: 40,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Samsung Secret Prototype Phone',
        slug: 'samsung-secret-prototype-sugg',
        sku: 'SAM-PROTO-999',
        brand: 'Samsung',
        shortDescription: 'Internal engineering sample.',
        fullDescription: 'Confidential sample.',
        regularPrice: 500000,
        categoryId: testCategory._id,
        stockQuantity: 1,
        status: ProductStatus.DRAFT, // Must NEVER appear in suggestions
      },
    ]);
  });

  afterAll(async () => {
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should return relevant product, category, and brand suggestions for query', async () => {
    const res = await testServer.request('/api/v1/products/suggestions?q=Smart');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.query).toBe('Smart');

    // Products matching "Smart"
    const productTitles = res.body.data.products.map((p: { title: string }) => p.title);
    expect(productTitles).toContain('Samsung Galaxy SmartTag2 Bluetooth Tracker');

    // Categories matching "Smart"
    const categoryNames = res.body.data.categories.map((c: { name: string }) => c.name);
    expect(categoryNames).toContain('Smartphones & Mobile Devices');
  });

  it('should enforce limit parameter on suggestions', async () => {
    const res = await testServer.request('/api/v1/products/suggestions?q=Samsung&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeLessThanOrEqual(2);
  });

  it('should strictly exclude unpublished and draft products from suggestions', async () => {
    const res = await testServer.request('/api/v1/products/suggestions?q=Prototype');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(0);
  });

  it('should strictly exclude inactive categories from suggestions', async () => {
    const res = await testServer.request('/api/v1/products/suggestions?q=Inactive');

    expect(res.status).toBe(200);
    expect(res.body.data.categories.length).toBe(0);
  });

  it('should reject requests missing the required q parameter with 422 validation error', async () => {
    const res = await testServer.request('/api/v1/products/suggestions');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should return empty lists when query has no matching results', async () => {
    const res = await testServer.request('/api/v1/products/suggestions?q=NonExistentSearchXyz');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(0);
    expect(res.body.data.categories.length).toBe(0);
    expect(res.body.data.brands.length).toBe(0);
  });
});
