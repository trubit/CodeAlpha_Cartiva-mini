import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { InventoryMovement } from '../../backend/src/models/InventoryMovement.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus, InventoryMovementType } from '@shared/enums.js';

describe('Inventory Initialization (/api/v1/admin/inventory/:inventoryId/initialize)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;
  let testCategory: CategoryDocument;
  let testProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-inventory-init-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await InventoryMovement.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Warehouse',
      email: 'admin.warehouse@cartivamini.test',
      phone: '+2348022334410',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'User',
      email: 'customer.inv@cartivamini.test',
      phone: '+2348022334411',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Electronics',
      slug: 'electronics-inv',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Wireless Keyboard',
      name: 'Wireless Keyboard',
      slug: 'wireless-keyboard-inv',
      sku: 'KEY-WL-001',
      shortDescription: 'Ergonomic wireless keyboard',
      fullDescription: 'High durability low profile mechanical keyboard.',
      regularPrice: 25000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 0,
      reservedQuantity: 0,
      lowStockThreshold: 5,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await InventoryMovement.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should initialize stock count, threshold, and create initial movement record', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/initialize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 50,
          lowStockThreshold: 10,
          reason: 'Initial warehouse stocking',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onHandQuantity).toBe(50);
    expect(res.body.data.availableQuantity).toBe(50);
    expect(res.body.data.lowStockThreshold).toBe(10);
    expect(res.body.data.status).toBe('in_stock');

    // Verify database record
    const updatedProd = await Product.findById(testProduct._id);
    expect(updatedProd?.stockQuantity).toBe(50);
    expect(updatedProd?.lowStockThreshold).toBe(10);

    // Verify immutable movement record
    const movements = await InventoryMovement.find({ sku: 'KEY-WL-001' });
    expect(movements.length).toBe(1);
    const firstMovement = movements[0]!;
    expect(firstMovement.movementType).toBe(InventoryMovementType.INITIAL_STOCK);
    expect(firstMovement.quantity).toBe(50);
    expect(firstMovement.previousStock).toBe(0);
    expect(firstMovement.newStock).toBe(50);
  });

  it('should reject accidental duplicate initialization for the same item', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/initialize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 100,
          reason: 'Duplicate initialization attempt',
        },
      }
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ALREADY_INITIALIZED');
  });

  it('should reject initialization with negative quantity', async () => {
    const uninitializedProduct = await Product.create({
      title: 'Gaming Mouse',
      name: 'Gaming Mouse',
      slug: 'gaming-mouse-inv',
      sku: 'MOUSE-GM-001',
      shortDescription: 'High precision mouse',
      fullDescription: 'High precision wireless gaming mouse.',
      regularPrice: 15000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    const res = await testServer.request(
      `/api/v1/admin/inventory/${uninitializedProduct._id.toString()}/initialize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: -5,
          reason: 'Invalid negative initial quantity',
        },
      }
    );

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated or non-admin requests to initialize stock', async () => {
    // Unauthenticated
    const resUnauth = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/initialize`,
      {
        method: 'POST',
        body: { quantity: 10 },
      }
    );
    expect(resUnauth.status).toBe(401);

    // Customer
    const resCust = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/initialize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { quantity: 10 },
      }
    );
    expect(resCust.status).toBe(403);
  });
});
