import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus } from '@shared/enums.js';

describe('Public Product Catalog & Filtering (/api/v1/products)', () => {
  let testServer: TestServer;
  let audioCategory: CategoryDocument;
  let homeCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-catalog-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await Category.deleteMany({});
    await Product.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    audioCategory = await Category.create({
      name: 'Audio Electronics',
      slug: 'audio-electronics',
      isActive: true,
    });

    homeCategory = await Category.create({
      name: 'Home Appliances',
      slug: 'home-appliances',
      isActive: true,
    });

    // Populate catalog with various statuses and price points
    await Product.create([
      {
        title: 'Noise Cancelling Wireless Headphones',
        slug: 'noise-cancelling-wireless-headphones',
        sku: 'AUD-NC-001',
        brand: 'SoundMaster',
        shortDescription: 'Active noise cancellation premium headphones',
        fullDescription: 'High resolution audio drivers with 30-hour battery life.',
        regularPrice: 50000,
        salePrice: 45000,
        costPrice: 28000, // Should be hidden from public API
        categoryId: audioCategory._id,
        stockQuantity: 20,
        status: ProductStatus.PUBLISHED,
        featured: true,
        averageRating: 4.8,
        reviewCount: 35,
      },
      {
        title: 'Portable Waterproof Bluetooth Speaker',
        slug: 'portable-waterproof-bluetooth-speaker',
        sku: 'AUD-SPK-002',
        brand: 'SoundMaster',
        shortDescription: 'IPX7 waterproof outdoor Bluetooth speaker',
        fullDescription: 'Deep bass sound with rugged all-weather rubberized casing.',
        regularPrice: 25000,
        costPrice: 14000,
        categoryId: audioCategory._id,
        stockQuantity: 15,
        status: ProductStatus.PUBLISHED,
        featured: false,
        averageRating: 4.5,
        reviewCount: 18,
      },
      {
        title: 'Smart Inverter Microwave Oven',
        slug: 'smart-inverter-microwave-oven',
        sku: 'HOM-MIC-001',
        brand: 'HomePro',
        shortDescription: 'Inverter heating 32L microwave',
        fullDescription: 'Even heating and defrosting sensor cooking technology.',
        regularPrice: 90000,
        costPrice: 60000,
        categoryId: homeCategory._id,
        stockQuantity: 8,
        status: ProductStatus.PUBLISHED,
        featured: true,
        averageRating: 4.6,
        reviewCount: 12,
      },
      {
        title: 'Draft Unreleased Earbuds',
        slug: 'draft-unreleased-earbuds',
        sku: 'AUD-DRF-999',
        brand: 'SoundMaster',
        shortDescription: 'Unreleased prototype earbuds',
        fullDescription: 'Internal testing only.',
        regularPrice: 35000,
        categoryId: audioCategory._id,
        status: ProductStatus.DRAFT, // MUST NOT BE RETURNED
      },
      {
        title: 'Archived Old Generator',
        slug: 'archived-old-generator',
        sku: 'HOM-ARC-999',
        shortDescription: 'Discontinued product',
        fullDescription: 'Archived record.',
        regularPrice: 120000,
        categoryId: homeCategory._id,
        status: ProductStatus.ARCHIVED, // MUST NOT BE RETURNED
      },
    ]);
  });

  afterAll(async () => {
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should return ONLY published products in public catalog listing', async () => {
    const res = await testServer.request('/api/v1/products', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const items: Array<{ slug: string; status: string; costPrice?: unknown }> = res.body.data;
    expect(items.length).toBe(3); // Exactly 3 published products

    // Verify draft and archived products are excluded
    expect(items.some((p) => p.slug === 'draft-unreleased-earbuds')).toBe(false);
    expect(items.some((p) => p.slug === 'archived-old-generator')).toBe(false);

    // Verify all returned items have status published
    items.forEach((p) => {
      expect(p.status).toBe(ProductStatus.PUBLISHED);
    });
  });

  it('should return published product detail by slug, and 404 for draft/archived products', async () => {
    // 1. Published item
    const publishedRes = await testServer.request(
      '/api/v1/products/noise-cancelling-wireless-headphones',
      { method: 'GET' }
    );
    expect(publishedRes.status).toBe(200);
    expect(publishedRes.body.data.slug).toBe('noise-cancelling-wireless-headphones');
    expect(publishedRes.body.data.regularPrice).toBe(50000);

    // 2. Draft item
    const draftRes = await testServer.request('/api/v1/products/draft-unreleased-earbuds', {
      method: 'GET',
    });
    expect(draftRes.status).toBe(404);

    // 3. Non-existent slug
    const notFoundRes = await testServer.request('/api/v1/products/non-existent-product-slug', {
      method: 'GET',
    });
    expect(notFoundRes.status).toBe(404);
  });

  it('should filter public products by category, brand, and price range', async () => {
    // Filter by audio category
    const catRes = await testServer.request(
      `/api/v1/products?category=${audioCategory._id.toString()}`,
      { method: 'GET' }
    );
    expect(catRes.status).toBe(200);
    expect(catRes.body.data.length).toBe(2);

    // Filter by brand HomePro
    const brandRes = await testServer.request('/api/v1/products?brand=HomePro', {
      method: 'GET',
    });
    expect(brandRes.status).toBe(200);
    expect(brandRes.body.data.length).toBe(1);
    expect(brandRes.body.data[0].slug).toBe('smart-inverter-microwave-oven');

    // Filter by price range (30,000 to 60,000 NGN)
    const priceRes = await testServer.request('/api/v1/products?minPrice=30000&maxPrice=60000', {
      method: 'GET',
    });
    expect(priceRes.status).toBe(200);
    expect(priceRes.body.data.length).toBe(1);
    expect(priceRes.body.data[0].slug).toBe('noise-cancelling-wireless-headphones');
  });

  it('should paginate products with proper limit and pagination metadata', async () => {
    const res = await testServer.request('/api/v1/products?page=1&limit=2', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.hasNextPage).toBe(true);
    expect(res.body.meta.hasPrevPage).toBe(false);
  });

  it('should never expose costPrice or internal database fields to public callers', async () => {
    const res = await testServer.request('/api/v1/products/noise-cancelling-wireless-headphones', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.costPrice).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();
  });

  it('should retrieve featured products and related products in same category', async () => {
    // 1. Featured products
    const featRes = await testServer.request('/api/v1/products/featured', {
      method: 'GET',
    });
    expect(featRes.status).toBe(200);
    expect(featRes.body.data.length).toBe(2); // 2 featured published items

    // 2. Related products for headphone in audio category
    const relRes = await testServer.request(
      '/api/v1/products/noise-cancelling-wireless-headphones/related',
      { method: 'GET' }
    );
    expect(relRes.status).toBe(200);
    expect(relRes.body.data.length).toBe(1);
    expect(relRes.body.data[0].slug).toBe('portable-waterproof-bluetooth-speaker');
  });
});
