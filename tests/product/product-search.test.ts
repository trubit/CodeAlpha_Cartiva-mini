import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { SearchAnalytics } from '../../backend/src/models/SearchAnalytics.model.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus } from '@shared/enums.js';

describe('Product Search Engine (/api/v1/products/search)', () => {
  let testServer: TestServer;
  let audioCategory: CategoryDocument;
  let computingCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-search-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await Category.deleteMany({});
    await Product.deleteMany({});
    await SearchAnalytics.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    audioCategory = await Category.create({
      name: 'Audio Gear',
      slug: 'audio-gear-search',
      isActive: true,
    });

    computingCategory = await Category.create({
      name: 'Computing & Accessories',
      slug: 'computing-accessories-search',
      isActive: true,
    });

    await Product.create([
      {
        title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
        slug: 'sony-wh-1000xm5-wireless-search',
        sku: 'SONY-WH-001',
        brand: 'Sony',
        shortDescription: 'Industry leading noise canceling wireless Bluetooth headphones.',
        fullDescription:
          'Two processors and eight microphones for unprecedented noise cancellation.',
        regularPrice: 220000,
        salePrice: 199000,
        costPrice: 150000,
        categoryId: audioCategory._id,
        stockQuantity: 15,
        reservedQuantity: 2,
        isInventoryTracked: true,
        status: ProductStatus.PUBLISHED,
        featured: true,
        tags: ['audio', 'wireless', 'noise-canceling', 'bluetooth'],
        averageRating: 4.9,
        reviewCount: 42,
      },
      {
        title: 'Sony SRS-XB13 Compact Bluetooth Speaker',
        slug: 'sony-srs-xb13-compact-search',
        sku: 'SONY-SPK-002',
        brand: 'Sony',
        shortDescription: 'Extra Bass compact portable waterproof wireless speaker.',
        fullDescription: 'IP67 waterproof and dustproof speaker with up to 16 hours of battery.',
        regularPrice: 35000,
        costPrice: 22000,
        categoryId: audioCategory._id,
        stockQuantity: 25,
        reservedQuantity: 0,
        isInventoryTracked: true,
        status: ProductStatus.PUBLISHED,
        featured: false,
        tags: ['audio', 'speaker', 'portable'],
        averageRating: 4.6,
        reviewCount: 19,
      },
      {
        title: 'Apple MacBook Pro 14 M3 Chip',
        slug: 'apple-macbook-pro-14-m3-search',
        sku: 'APPLE-MBP-001',
        brand: 'Apple',
        shortDescription: 'Liquid Retina XDR display with blazing M3 architecture.',
        fullDescription: 'Pro laptop with unprecedented performance and 22 hours of battery life.',
        regularPrice: 950000,
        costPrice: 750000,
        categoryId: computingCategory._id,
        stockQuantity: 8,
        reservedQuantity: 1,
        isInventoryTracked: true,
        status: ProductStatus.PUBLISHED,
        featured: true,
        tags: ['laptop', 'apple', 'computing', 'm3'],
        averageRating: 5.0,
        reviewCount: 50,
      },
      {
        title: 'Logitech MX Master 3S Wireless Performance Mouse',
        slug: 'logitech-mx-master-3s-search',
        sku: 'LOGI-MX-001',
        brand: 'Logitech',
        shortDescription: 'Quiet clicks ergonomic 8K DPI sensor wireless mouse.',
        fullDescription: 'Quiet click electromagnetic scroll wheel for ultimate precision.',
        regularPrice: 75000,
        costPrice: 50000,
        categoryId: computingCategory._id,
        stockQuantity: 0,
        reservedQuantity: 0,
        isInventoryTracked: true,
        status: ProductStatus.PUBLISHED,
        featured: false,
        tags: ['mouse', 'ergonomic', 'office', 'wireless'],
        averageRating: 4.8,
        reviewCount: 28,
      },
      {
        title: 'Unpublished Prototype Earbuds',
        slug: 'unpublished-prototype-earbuds-search',
        sku: 'PROTO-EAR-001',
        brand: 'Sony',
        shortDescription: 'Confidential internal prototype earbuds.',
        fullDescription: 'Not for public sale.',
        regularPrice: 10000,
        categoryId: audioCategory._id,
        stockQuantity: 5,
        status: ProductStatus.DRAFT, // Must NEVER be returned publicly
      },
      {
        title: 'Discontinued Vintage Walkman',
        slug: 'discontinued-vintage-walkman-search',
        sku: 'VINTAGE-001',
        brand: 'Sony',
        shortDescription: 'Archived cassette player walkman.',
        fullDescription: 'Vintage archived unit.',
        regularPrice: 40000,
        categoryId: audioCategory._id,
        stockQuantity: 0,
        status: ProductStatus.ARCHIVED, // Must NEVER be returned publicly
      },
    ]);
  });

  afterAll(async () => {
    await Category.deleteMany({});
    await Product.deleteMany({});
    await SearchAnalytics.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should search products by product title', async () => {
    const res = await testServer.request('/api/v1/products/search?q=Headphones');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].sku).toBe('SONY-WH-001');
    expect(res.body.data.query).toBe('Headphones');
  });

  it('should search products by brand', async () => {
    const res = await testServer.request('/api/v1/products/search?q=Apple');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].brand).toBe('Apple');
    expect(res.body.data.products[0].sku).toBe('APPLE-MBP-001');
  });

  it('should search products by SKU', async () => {
    const res = await testServer.request('/api/v1/products/search?q=LOGI-MX-001');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].sku).toBe('LOGI-MX-001');
  });

  it('should normalize search query and trim leading/trailing whitespace', async () => {
    const res = await testServer.request(
      '/api/v1/products/search?q=%20%20Sony%20%20%20Speaker%20%20'
    );

    expect(res.status).toBe(200);
    expect(res.body.data.query).toBe('Sony Speaker');
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].sku).toBe('SONY-SPK-002');
  });

  it('should safely handle search inputs with regex special characters without crashing (ReDoS protection)', async () => {
    const res = await testServer.request(
      '/api/v1/products/search?q=' + encodeURIComponent('Sony[.*+?^${}()|[]\\')
    );

    expect(res.status).toBe(200);
    // Should safely escape regex and return 0 or safe matches rather than throwing 500
    expect(Array.isArray(res.body.data.products)).toBe(true);
  });

  it('should return empty list when no products match the search query', async () => {
    const res = await testServer.request('/api/v1/products/search?q=NonExistentGadgetX999');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });

  it('should strictly exclude draft, unpublished, and archived products from search results', async () => {
    const res = await testServer.request('/api/v1/products/search?q=Sony');

    expect(res.status).toBe(200);
    const skus = res.body.data.products.map((p: { sku: string }) => p.sku);

    // Published products must be present
    expect(skus).toContain('SONY-WH-001');
    expect(skus).toContain('SONY-SPK-002');

    // Draft / Archived products must NOT be present
    expect(skus).not.toContain('PROTO-EAR-001');
    expect(skus).not.toContain('VINTAGE-001');
  });

  it('should return accurate search facet distributions for categories, brands, prices, and stock', async () => {
    const res = await testServer.request('/api/v1/products/search?q=Sony');

    expect(res.status).toBe(200);
    const facets = res.body.data.facets;
    expect(facets).toBeDefined();

    // Brands facet
    const sonyBrand = facets.brands.find((b: { value: string }) => b.value === 'Sony');
    expect(sonyBrand).toBeDefined();
    expect(sonyBrand.count).toBe(2);

    // Price stats
    expect(facets.priceRange.min).toBe(35000);
    expect(facets.priceRange.max).toBe(220000);

    // Availability stats
    expect(facets.availability.inStock).toBe(2);
    expect(facets.availability.outOfStock).toBe(0);
  });

  it('should combine search keyword with structured filters', async () => {
    // Search Sony with maxPrice 100000 should return only the speaker (35k), not the headphones (220k)
    const res = await testServer.request('/api/v1/products/search?q=Sony&maxPrice=100000');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].sku).toBe('SONY-SPK-002');
  });

  it('should asynchronously record search query in privacy-conscious SearchAnalytics collection', async () => {
    await testServer.request('/api/v1/products/search?q=MacBook', {
      headers: {
        'x-session-id': 'session-analytics-test-01',
        'user-agent': 'Mozilla/5.0 Test Suite Agent',
      },
    });

    // Wait 100ms for asynchronous fire-and-forget logging to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    const record = await SearchAnalytics.findOne({ query: 'macbook' });
    expect(record).toBeDefined();
    expect(record?.resultCount).toBe(1);
    expect(record?.sessionId).toBe('session-analytics-test-01');
    expect(record?.anonymizedIp).toBeDefined();
  });
});
