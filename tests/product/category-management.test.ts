import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus } from '@shared/enums.js';

describe('Category Taxonomy Management (/api/v1/categories & /api/v1/admin/categories)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-category-test';

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
      lastName: 'CategoryMgr',
      email: 'admin.cat@cartivamini.test',
      phone: '+2348011223301',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'Regular',
      email: 'customer.cat@cartivamini.test',
      phone: '+2348011223302',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await AuditLog.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should allow administrator to create a parent category and subcategory', async () => {
    // 1. Create parent category
    const parentRes = await testServer.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Computing & Tech',
        description: 'Laptops, desktops, and computing accessories.',
        displayOrder: 1,
        isActive: true,
      },
    });

    expect(parentRes.status).toBe(201);
    expect(parentRes.body.success).toBe(true);
    expect(parentRes.body.data.name).toBe('Computing & Tech');
    expect(parentRes.body.data.slug).toBe('computing-tech');
    expect(parentRes.body.data.parentId).toBeNull();
    const parentId = parentRes.body.data.id;

    // 2. Create subcategory with parentId
    const subRes = await testServer.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Laptops & MacBooks',
        description: 'Portable workstations and ultrabooks.',
        parentId,
        displayOrder: 1,
      },
    });

    expect(subRes.status).toBe(201);
    expect(subRes.body.success).toBe(true);
    expect(subRes.body.data.name).toBe('Laptops & MacBooks');
    expect(subRes.body.data.slug).toBe('laptops-macbooks');
    expect(subRes.body.data.parentId).toBe(parentId);
  });

  it('should reject duplicate category slug with 409 Conflict', async () => {
    const res = await testServer.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Computing Tech Duplicate',
        slug: 'computing-tech', // Duplicate slug of previous test
        description: 'Another tech category with same slug.',
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SLUG');
  });

  it('should reject a category being set as its own parent with 400 Bad Request', async () => {
    const cat = await Category.create({
      name: 'Mobile Devices',
      slug: 'mobile-devices',
      description: 'Smartphones and tablets',
      isActive: true,
    });

    const res = await testServer.request(`/api/v1/admin/categories/${cat._id.toString()}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        parentId: cat._id.toString(), // Self-referencing parent
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CIRCULAR_CATEGORY_DEPENDENCY');
  });

  it('should reject circular category relationship (A -> B -> A) with 400 Bad Request', async () => {
    // Cat A
    const catA = await Category.create({
      name: 'Fashion Hub',
      slug: 'fashion-hub',
      isActive: true,
    });

    // Cat B (child of A)
    const catB = await Category.create({
      name: 'Men Footwear',
      slug: 'men-footwear',
      parentId: catA._id,
      isActive: true,
    });

    // Attempt to update A to have parent B (creating cycle: A -> B -> A)
    const res = await testServer.request(`/api/v1/admin/categories/${catA._id.toString()}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        parentId: catB._id.toString(),
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CIRCULAR_CATEGORY_DEPENDENCY');
  });

  it('should prevent deleting a category if active products are assigned', async () => {
    const category = await Category.create({
      name: 'Home Audio',
      slug: 'home-audio',
      isActive: true,
    });

    // Assign a product to this category
    await Product.create({
      title: 'Studio Soundbar Pro',
      slug: 'studio-soundbar-pro',
      sku: 'SND-BAR-001',
      shortDescription: 'Dolby Atmos home soundbar',
      fullDescription: 'High fidelity audio system with wireless subwoofer.',
      regularPrice: 75000,
      categoryId: category._id,
      stockQuantity: 10,
      status: ProductStatus.PUBLISHED,
    });

    const deleteRes = await testServer.request(
      `/api/v1/admin/categories/${category._id.toString()}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.success).toBe(false);
    expect(deleteRes.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
    expect(deleteRes.body.error.message).toContain('Cannot delete category containing');
  });

  it('should reject non-admin customer and unauthenticated requests to admin category endpoints', async () => {
    // Unauthenticated request
    const unauthRes = await testServer.request('/api/v1/admin/categories', {
      method: 'POST',
      body: { name: 'Unauthorized Category' },
    });
    expect(unauthRes.status).toBe(401);

    // Customer request
    const customerRes = await testServer.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { name: 'Customer Attempt' },
    });
    expect(customerRes.status).toBe(403);
  });

  it('should return only active categories in public hierarchical category query', async () => {
    // Active parent
    const activeParent = await Category.create({
      name: 'Books & Media',
      slug: 'books-media',
      displayOrder: 1,
      isActive: true,
    });

    // Active child
    await Category.create({
      name: 'Fiction',
      slug: 'fiction-novels',
      parentId: activeParent._id,
      displayOrder: 1,
      isActive: true,
    });

    // Inactive category
    await Category.create({
      name: 'Archived Old Category',
      slug: 'archived-old-category',
      isActive: false,
    });

    const res = await testServer.request('/api/v1/categories', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const categories: Array<{ slug: string; children: Array<{ slug: string }> }> = res.body.data;
    // Inactive category should NOT be returned
    expect(categories.some((c) => c.slug === 'archived-old-category')).toBe(false);

    // Active parent should have its child nested
    const foundParent = categories.find((c) => c.slug === 'books-media');
    expect(foundParent).toBeDefined();
    expect(foundParent?.children.some((child) => child.slug === 'fiction-novels')).toBe(true);
  });
});
