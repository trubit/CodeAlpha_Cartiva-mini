import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { searchCacheService } from '../../backend/src/services/searchCache.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus } from '@shared/enums.js';

describe('Search & Discovery Caching Architecture', () => {
  let testServer: TestServer;
  let adminToken: string;
  let testCategory: CategoryDocument;
  let cachedProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-caching-test';

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
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'CacheTester',
      email: 'admin.cache@cartivamini.test',
      phone: '+2348022339900',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(adminUser);

    testCategory = await Category.create({
      name: 'Wearables',
      slug: 'wearables-cache-test',
      isActive: true,
    });

    cachedProduct = await Product.create({
      title: 'Smart Fitness Tracker Band 7',
      slug: 'smart-fitness-tracker-band-7-cache',
      sku: 'BAND-7-CACHE',
      brand: 'FitPro',
      shortDescription: 'OLED fitness band tracker.',
      fullDescription: 'Continuous heart rate and sleep tracking.',
      regularPrice: 20000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 15,
      reservedQuantity: 0,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });
  });

  beforeEach(() => {
    searchCacheService.clear();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    searchCacheService.clear();
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should cache public product search queries and serve from memory', async () => {
    // 1. Initial request (cache miss)
    const res1 = await testServer.request('/api/v1/products/search?q=Fitness');
    expect(res1.status).toBe(200);
    expect(res1.body.data.products.length).toBe(1);

    // Verify cache has an entry
    const cacheKey = searchCacheService.generateKey('prod:search', {
      q: 'Fitness',
      page: 1,
      limit: 20,
    });
    const cachedData = searchCacheService.get(cacheKey);
    expect(cachedData).toBeDefined();

    // 2. Second request should return identical payload
    const res2 = await testServer.request('/api/v1/products/search?q=Fitness');
    expect(res2.status).toBe(200);
    expect(res2.body.data.products[0].sku).toBe('BAND-7-CACHE');
  });

  it('should immediately invalidate search cache when a product is un-published or modified', async () => {
    // Populate cache first
    await testServer.request('/api/v1/products/search?q=Fitness');
    const cacheKey = searchCacheService.generateKey('prod:search', {
      q: 'Fitness',
      page: 1,
      limit: 20,
    });
    expect(searchCacheService.get(cacheKey)).toBeDefined();

    // Admin unpublishes the product
    const updateRes = await testServer.request(
      `/api/v1/admin/products/${cachedProduct._id.toString()}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: ProductStatus.UNPUBLISHED },
      }
    );
    expect(updateRes.status).toBe(200);

    // Verify cache key was purged by the mutation hook
    expect(searchCacheService.get(cacheKey)).toBeNull();

    // Subsequent search must immediately return 0 products (zero stale unpublished visibility)
    const searchAfter = await testServer.request('/api/v1/products/search?q=Fitness');
    expect(searchAfter.status).toBe(200);
    expect(searchAfter.body.data.products.length).toBe(0);

    // Restore to PUBLISHED for subsequent tests
    await testServer.request(`/api/v1/admin/products/${cachedProduct._id.toString()}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: ProductStatus.PUBLISHED },
    });
  });

  it('should invalidate category tree cache when admin updates a category', async () => {
    // 1. Warm cache
    const initialTree = await testServer.request('/api/v1/categories');
    expect(initialTree.status).toBe(200);
    expect(searchCacheService.get('cat:public_tree')).toBeDefined();

    // 2. Admin updates category name
    const updateRes = await testServer.request(
      `/api/v1/admin/categories/${testCategory._id.toString()}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { name: 'Wearables & Health Tech' },
      }
    );
    expect(updateRes.status).toBe(200);

    // 3. Verify category cache was invalidated
    expect(searchCacheService.get('cat:public_tree')).toBeNull();

    // 4. Next public fetch reflects the fresh category name
    const freshTree = await testServer.request('/api/v1/categories');
    expect(freshTree.status).toBe(200);
    const updatedCat = freshTree.body.data.find(
      (c: { id: string }) => c.id === testCategory._id.toString()
    );
    expect(updatedCat?.name).toBe('Wearables & Health Tech');
  });

  it('should expire cache entries after TTL duration has elapsed', () => {
    const testKey = 'test:expiring:key';
    searchCacheService.set(testKey, { test: 'value' }, 0.05); // 50ms TTL

    expect(searchCacheService.get(testKey)).toBeDefined();

    // After 100ms, entry should be expired and return null
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(searchCacheService.get(testKey)).toBeNull();
        resolve();
      }, 70);
    });
  });
});
