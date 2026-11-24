import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus } from '@shared/enums.js';

describe('Product Management (/api/v1/admin/products)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;
  let testCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-product-mgmt-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await AuditLog.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'ProductMgr',
      email: 'admin.prod@cartivamini.test',
      phone: '+2348022334401',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'Shopper',
      email: 'customer.prod@cartivamini.test',
      phone: '+2348022334402',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Smartphones & Accessories',
      slug: 'smartphones-accessories',
      isActive: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await AuditLog.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should allow administrator to create a product with auto-generated unique slug', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Flagship Smartphone Pro Max',
        sku: 'PHN-FLG-001',
        brand: 'CartivaTech',
        shortDescription: 'Latest 5G flagship with titanium chassis',
        fullDescription:
          'High performance smartphone equipped with high density AMOLED display and 200MP camera.',
        regularPrice: 450000,
        salePrice: 420000,
        categoryId: testCategory._id.toString(),
        stockQuantity: 25,
        status: ProductStatus.DRAFT,
        tags: ['5g', 'flagship', 'smartphone'],
        attributes: {
          color: 'Titanium Grey',
          storage: '256GB',
          ram: '12GB',
        },
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Flagship Smartphone Pro Max');
    expect(res.body.data.slug).toBe('flagship-smartphone-pro-max');
    expect(res.body.data.sku).toBe('PHN-FLG-001');
    expect(res.body.data.regularPrice).toBe(450000);
    expect(res.body.data.salePrice).toBe(420000);
    expect(res.body.data.attributes.color).toBe('Titanium Grey');
  });

  it('should reject product creation with duplicate SKU with 409 Conflict', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Another Smartphone',
        sku: 'phn-flg-001', // Duplicate SKU (case-insensitive test)
        shortDescription: 'Another phone',
        fullDescription: 'Description of duplicate phone.',
        regularPrice: 200000,
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('should reject product creation with duplicate manual slug with 409 Conflict', async () => {
    const res = await testServer.request('/api/v1/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Smartphone Clone',
        slug: 'flagship-smartphone-pro-max', // Already taken
        sku: 'PHN-CLN-002',
        shortDescription: 'Clone phone',
        fullDescription: 'Description of clone phone.',
        regularPrice: 300000,
        categoryId: testCategory._id.toString(),
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SLUG');
  });

  it('should allow administrator to update product details and pricing', async () => {
    const product = await Product.findOne({ sku: 'PHN-FLG-001' });
    expect(product).not.toBeNull();

    const updateRes = await testServer.request(
      `/api/v1/admin/products/${product!._id.toString()}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'Flagship Smartphone Pro Max Ultra',
          regularPrice: 480000,
          salePrice: 440000,
          stockQuantity: 30,
        },
      }
    );

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.title).toBe('Flagship Smartphone Pro Max Ultra');
    expect(updateRes.body.data.slug).toBe('flagship-smartphone-pro-max-ultra');
    expect(updateRes.body.data.previousSlugs).toContain('flagship-smartphone-pro-max');
    expect(updateRes.body.data.regularPrice).toBe(480000);
    expect(updateRes.body.data.salePrice).toBe(440000);
    expect(updateRes.body.data.stockQuantity).toBe(30);

    // Verify lookup by the old slug resolves the product seamlessly
    await Product.findByIdAndUpdate(product!._id, { status: ProductStatus.PUBLISHED });
    const oldSlugRes = await testServer.request('/api/v1/products/flagship-smartphone-pro-max', {
      method: 'GET',
    });
    expect(oldSlugRes.status).toBe(200);
    expect(oldSlugRes.body.data.id).toBe(product!._id.toString());
    expect(oldSlugRes.body.data.slug).toBe('flagship-smartphone-pro-max-ultra');
  });

  it('should allow administrator to update product status (publish/unpublish)', async () => {
    const product = await Product.findOne({ sku: 'PHN-FLG-001' });

    // Publish
    const pubRes = await testServer.request(
      `/api/v1/admin/products/${product!._id.toString()}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: ProductStatus.PUBLISHED },
      }
    );

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.status).toBe(ProductStatus.PUBLISHED);

    // Unpublish
    const unpubRes = await testServer.request(
      `/api/v1/admin/products/${product!._id.toString()}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: ProductStatus.UNPUBLISHED },
      }
    );

    expect(unpubRes.status).toBe(200);
    expect(unpubRes.body.data.status).toBe(ProductStatus.UNPUBLISHED);
  });

  it('should archive product and preserve document record upon deletion', async () => {
    const toArchive = await Product.create({
      title: 'Discontinued Tablet',
      slug: 'discontinued-tablet',
      sku: 'TAB-DIS-999',
      shortDescription: 'Old generation tablet',
      fullDescription: 'Discontinued product kept for order audit integrity.',
      regularPrice: 80000,
      categoryId: testCategory._id,
      stockQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    const delRes = await testServer.request(`/api/v1/admin/products/${toArchive._id.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify document was soft-deleted to ARCHIVED, not deleted from MongoDB
    const archivedDoc = await Product.findById(toArchive._id);
    expect(archivedDoc).not.toBeNull();
    expect(archivedDoc?.status).toBe(ProductStatus.ARCHIVED);
  });

  it('should reject non-admin customer and unauthenticated requests with 401/403', async () => {
    const unauthRes = await testServer.request('/api/v1/admin/products', {
      method: 'GET',
    });
    expect(unauthRes.status).toBe(401);

    const customerRes = await testServer.request('/api/v1/admin/products', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(customerRes.status).toBe(403);
  });
});
