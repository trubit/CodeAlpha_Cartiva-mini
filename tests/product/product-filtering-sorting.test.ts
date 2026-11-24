import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus } from '@shared/enums.js';

describe('Product Filtering & Sorting Engine (/api/v1/products)', () => {
  let testServer: TestServer;
  let testCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-filtering-test';

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
      name: 'Consumer Electronics',
      slug: 'consumer-electronics-filter',
      isActive: true,
    });

    // Populate catalog with varied pricing, ratings, creation dates, stock availability, and attributes
    await Product.create([
      {
        title: 'Alpha Budget Earphones',
        slug: 'alpha-budget-earphones-filter',
        sku: 'EAR-ALPHA-001',
        brand: 'SoundBrand',
        shortDescription: 'Affordable stereo earphones.',
        fullDescription: 'Good sound on a budget.',
        regularPrice: 5000,
        currency: 'NGN',
        categoryId: testCategory._id,
        stockQuantity: 100,
        reservedQuantity: 0,
        isInventoryTracked: true,
        averageRating: 3.5,
        reviewCount: 10,
        attributes: { color: 'Black', type: 'wired' },
        status: ProductStatus.PUBLISHED,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        title: 'Beta Midrange Bluetooth Headphones',
        slug: 'beta-midrange-headphones-filter',
        sku: 'EAR-BETA-002',
        brand: 'SoundBrand',
        shortDescription: 'Midrange wireless audio headphones.',
        fullDescription: 'Clear audio with good battery life.',
        regularPrice: 30000,
        currency: 'NGN',
        categoryId: testCategory._id,
        stockQuantity: 50,
        reservedQuantity: 5,
        isInventoryTracked: true,
        averageRating: 4.5,
        reviewCount: 85,
        attributes: { color: 'Silver', type: 'wireless' },
        status: ProductStatus.PUBLISHED,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
      {
        title: 'Gamma Flagship Audiophile Cans',
        slug: 'gamma-flagship-headphones-filter',
        sku: 'EAR-GAMMA-003',
        brand: 'AcousticPro',
        shortDescription: 'Reference grade studio monitor headphones.',
        fullDescription: 'Zero distortion open-back design.',
        regularPrice: 180000,
        currency: 'NGN',
        categoryId: testCategory._id,
        stockQuantity: 12,
        reservedQuantity: 2,
        isInventoryTracked: true,
        averageRating: 4.9,
        reviewCount: 40,
        attributes: { color: 'Black', type: 'wired' },
        status: ProductStatus.PUBLISHED,
        createdAt: new Date('2026-03-01T00:00:00Z'),
      },
      {
        title: 'Delta Limited Out Of Stock Headset',
        slug: 'delta-out-of-stock-filter',
        sku: 'EAR-DELTA-004',
        brand: 'AcousticPro',
        shortDescription: 'Currently sold out limited model.',
        fullDescription: 'Sold out unit.',
        regularPrice: 95000,
        currency: 'NGN',
        categoryId: testCategory._id,
        stockQuantity: 10,
        reservedQuantity: 10, // Available stock = 10 - 10 = 0 (Out of stock!)
        isInventoryTracked: true,
        averageRating: 4.7,
        reviewCount: 15,
        attributes: { color: 'Gold', type: 'wireless' },
        status: ProductStatus.PUBLISHED,
        createdAt: new Date('2026-04-01T00:00:00Z'),
      },
    ]);
  });

  afterAll(async () => {
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should filter products by price range', async () => {
    const res = await testServer.request('/api/v1/products?minPrice=10000&maxPrice=100000');

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('EAR-BETA-002'); // 30k
    expect(skus).toContain('EAR-DELTA-004'); // 95k
    expect(skus).not.toContain('EAR-ALPHA-001'); // 5k (too low)
    expect(skus).not.toContain('EAR-GAMMA-003'); // 180k (too high)
  });

  it('should reject invalid price range where minPrice > maxPrice with 422 error', async () => {
    const res = await testServer.request('/api/v1/products?minPrice=50000&maxPrice=10000');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should filter products by brand', async () => {
    const res = await testServer.request('/api/v1/products?brand=AcousticPro');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    for (const prod of res.body.data) {
      expect(prod.brand).toBe('AcousticPro');
    }
  });

  it('should filter products by availability=in_stock using Phase 8 stock formula', async () => {
    const res = await testServer.request('/api/v1/products?availability=in_stock');

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('EAR-ALPHA-001'); // 100 available
    expect(skus).toContain('EAR-BETA-002'); // 45 available
    expect(skus).toContain('EAR-GAMMA-003'); // 10 available
    expect(skus).not.toContain('EAR-DELTA-004'); // 0 available (10 onHand - 10 reserved)
  });

  it('should filter products by availability=out_of_stock', async () => {
    const res = await testServer.request('/api/v1/products?availability=out_of_stock');

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('EAR-DELTA-004');
    expect(skus).not.toContain('EAR-ALPHA-001');
  });

  it('should filter products by dynamic attribute (e.g. attributes.color=Black)', async () => {
    const res = await testServer.request('/api/v1/products?attributes[color]=Black');

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('EAR-ALPHA-001');
    expect(skus).toContain('EAR-GAMMA-003');
    expect(skus).not.toContain('EAR-BETA-002'); // Silver
  });

  it('should sort products by price ascending (price_asc)', async () => {
    const res = await testServer.request('/api/v1/products?sort=price_asc');

    expect(res.status).toBe(200);
    const prices = res.body.data.map((p: { regularPrice: number }) => p.regularPrice);
    expect(prices).toEqual([5000, 30000, 95000, 180000]);
  });

  it('should sort products by price descending (price_desc)', async () => {
    const res = await testServer.request('/api/v1/products?sort=price_desc');

    expect(res.status).toBe(200);
    const prices = res.body.data.map((p: { regularPrice: number }) => p.regularPrice);
    expect(prices).toEqual([180000, 95000, 30000, 5000]);
  });

  it('should sort products by title alphabetical (name_asc)', async () => {
    const res = await testServer.request('/api/v1/products?sort=name_asc');

    expect(res.status).toBe(200);
    const titles = res.body.data.map((p: { title: string }) => p.title);
    expect(titles[0]).toBe('Alpha Budget Earphones');
    expect(titles[1]).toBe('Beta Midrange Bluetooth Headphones');
    expect(titles[2]).toBe('Delta Limited Out Of Stock Headset');
    expect(titles[3]).toBe('Gamma Flagship Audiophile Cans');
  });

  it('should sort products by title reverse alphabetical (name_desc)', async () => {
    const res = await testServer.request('/api/v1/products?sort=name_desc');

    expect(res.status).toBe(200);
    const titles = res.body.data.map((p: { title: string }) => p.title);
    expect(titles[0]).toBe('Gamma Flagship Audiophile Cans');
    expect(titles[3]).toBe('Alpha Budget Earphones');
  });

  it('should sort products by rating (rating)', async () => {
    const res = await testServer.request('/api/v1/products?sort=rating');

    expect(res.status).toBe(200);
    const ratings = res.body.data.map((p: { averageRating: number }) => p.averageRating);
    expect(ratings[0]).toBe(4.9);
    expect(ratings[ratings.length - 1]).toBe(3.5);
  });

  it('should sort products by popularity / review count (popular)', async () => {
    const res = await testServer.request('/api/v1/products?sort=popular');

    expect(res.status).toBe(200);
    const counts = res.body.data.map((p: { reviewCount: number }) => p.reviewCount);
    expect(counts[0]).toBe(85); // Beta has 85 reviews
    expect(counts[counts.length - 1]).toBe(10); // Alpha has 10 reviews
  });

  it('should retrieve new arrivals via /api/v1/products/new-arrivals', async () => {
    const res = await testServer.request('/api/v1/products/new-arrivals?limit=2');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    // Newest is Delta (April 2026), second newest is Gamma (March 2026)
    expect(res.body.data[0].sku).toBe('EAR-DELTA-004');
    expect(res.body.data[1].sku).toBe('EAR-GAMMA-003');
  });

  it('should support pagination limits and page boundaries with accurate metadata', async () => {
    const resPage1 = await testServer.request('/api/v1/products?page=1&limit=2');

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data.length).toBe(2);
    expect(resPage1.body.meta.page).toBe(1);
    expect(resPage1.body.meta.limit).toBe(2);
    expect(resPage1.body.meta.total).toBe(4);
    expect(resPage1.body.meta.totalPages).toBe(2);
    expect(resPage1.body.meta.hasNextPage).toBe(true);
    expect(resPage1.body.meta.hasPrevPage).toBe(false);

    const resPage2 = await testServer.request('/api/v1/products?page=2&limit=2');
    expect(resPage2.status).toBe(200);
    expect(resPage2.body.data.length).toBe(2);
    expect(resPage2.body.meta.page).toBe(2);
    expect(resPage2.body.meta.hasNextPage).toBe(false);
    expect(resPage2.body.meta.hasPrevPage).toBe(true);
  });
});
