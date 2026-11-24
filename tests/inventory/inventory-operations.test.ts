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

describe('Inventory Stock Operations (/api/v1/admin/inventory/:inventoryId)', () => {
  let testServer: TestServer;
  let adminToken: string;
  let testCategory: CategoryDocument;
  let testProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-inventory-ops-test';

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
      lastName: 'Operator',
      email: 'admin.ops@cartivamini.test',
      phone: '+2348022334420',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    testCategory = await Category.create({
      name: 'Audio Gear',
      slug: 'audio-gear-ops',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Studio Monitor Headphones',
      name: 'Studio Monitor Headphones',
      slug: 'studio-monitor-headphones-ops',
      sku: 'HEADPHONE-ST-001',
      shortDescription: 'Professional studio monitor headphones',
      fullDescription: 'Closed-back dynamic monitoring headphones.',
      regularPrice: 45000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 20,
      reservedQuantity: 2,
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

  it('should receive newly arrived stock and record a restock movement', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/receive`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 15,
          reason: 'Supplier shipment received: PO-9988',
          referenceId: 'PO-9988',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onHandQuantity).toBe(35);
    expect(res.body.data.reservedQuantity).toBe(2);
    expect(res.body.data.availableQuantity).toBe(33);

    // Verify movement in ledger
    const latestMovement = await InventoryMovement.findOne({
      sku: 'HEADPHONE-ST-001',
      movementType: InventoryMovementType.RESTOCK,
    });
    expect(latestMovement).toBeDefined();
    expect(latestMovement?.quantity).toBe(15);
    expect(latestMovement?.previousStock).toBe(20);
    expect(latestMovement?.newStock).toBe(35);
    expect(latestMovement?.referenceId).toBe('PO-9988');
  });

  it('should deduct stock for damaged items and record audit details', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/deduct`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 3,
          reason: 'Items damaged during warehouse transit',
          movementType: 'damaged_stock',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onHandQuantity).toBe(32);
    expect(res.body.data.availableQuantity).toBe(30);

    const movement = await InventoryMovement.findOne({
      sku: 'HEADPHONE-ST-001',
      movementType: InventoryMovementType.DAMAGED_STOCK,
    });
    expect(movement?.quantity).toBe(-3);
    expect(movement?.previousStock).toBe(35);
    expect(movement?.newStock).toBe(32);
  });

  it('should reject stock deduction that exceeds available stock', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/deduct`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 100,
          reason: 'Over-deduction attempt',
        },
      }
    );

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('should adjust stock count manually to a reconciled quantity', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/adjust`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          targetQuantity: 25,
          reason: 'Quarterly inventory audit count reconciliation',
          referenceId: 'AUDIT-Q3',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onHandQuantity).toBe(25);
    expect(res.body.data.availableQuantity).toBe(23); // 25 on-hand - 2 reserved

    const movement = await InventoryMovement.findOne({
      sku: 'HEADPHONE-ST-001',
      movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
    });
    expect(movement?.previousStock).toBe(32);
    expect(movement?.newStock).toBe(25);
    expect(movement?.quantity).toBe(-7);
  });

  it('should update low stock threshold via PATCH /threshold', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/threshold`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          lowStockThreshold: 12,
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.lowStockThreshold).toBe(12);
  });

  it('should paginate and retrieve movements for the item', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/movements?page=1&limit=10`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
  });
});
