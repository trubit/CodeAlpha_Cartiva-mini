import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { InventoryMovement } from '../../backend/src/models/InventoryMovement.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus, InventoryMovementType } from '@shared/enums.js';

describe('Inventory Variation Stock Management', () => {
  let testServer: TestServer;
  let adminToken: string;
  let testCategory: CategoryDocument;
  let testProduct: ProductDocument;
  let variantSmallId: string;
  let variantLargeId: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-inventory-var-test';

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
      lastName: 'Apparel',
      email: 'admin.apparel@cartivamini.test',
      phone: '+2348022334430',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    testCategory = await Category.create({
      name: 'Apparel & Fashion',
      slug: 'apparel-fashion-var',
      isActive: true,
    });

    const smallId = new Types.ObjectId();
    const largeId = new Types.ObjectId();
    variantSmallId = smallId.toString();
    variantLargeId = largeId.toString();

    testProduct = await Product.create({
      title: 'Premium Cotton Crewneck T-Shirt',
      name: 'Premium Cotton Crewneck T-Shirt',
      slug: 'premium-cotton-crewneck-tshirt-var',
      sku: 'TSHIRT-CREW-MAIN',
      shortDescription: '100% organic cotton t-shirt',
      fullDescription: 'Heavyweight organic cotton premium crewneck.',
      regularPrice: 12000,
      currency: 'NGN',
      categoryId: testCategory._id,
      hasVariants: true,
      stockQuantity: 40, // 15 + 25
      reservedQuantity: 0,
      variants: [
        {
          _id: smallId,
          sku: 'TSHIRT-CREW-S-BLK',
          title: 'Small / Black',
          price: 12000,
          stockQuantity: 15,
          reservedQuantity: 0,
          lowStockThreshold: 5,
          isInventoryTracked: true,
          attributes: { size: 'S', color: 'Black' },
        },
        {
          _id: largeId,
          sku: 'TSHIRT-CREW-L-BLK',
          title: 'Large / Black',
          price: 12000,
          stockQuantity: 25,
          reservedQuantity: 0,
          lowStockThreshold: 5,
          isInventoryTracked: true,
          attributes: { size: 'L', color: 'Black' },
        },
      ],
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

  it('should track and retrieve stock independently for each variation', async () => {
    // 1. Query Small variant by its ID
    const resSmall = await testServer.request(`/api/v1/admin/inventory/${variantSmallId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resSmall.status).toBe(200);
    expect(resSmall.body.data.sku).toBe('TSHIRT-CREW-S-BLK');
    expect(resSmall.body.data.onHandQuantity).toBe(15);
    expect(resSmall.body.data.variantTitle).toBe('Small / Black');

    // 2. Query Large variant by its SKU
    const resLarge = await testServer.request(`/api/v1/admin/inventory/TSHIRT-CREW-L-BLK`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resLarge.status).toBe(200);
    expect(resLarge.body.data.sku).toBe('TSHIRT-CREW-L-BLK');
    expect(resLarge.body.data.onHandQuantity).toBe(25);
  });

  it('should receive stock specifically for a variant and sync parent total', async () => {
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/receive?variantId=${variantSmallId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 10,
          reason: 'Restocking Small / Black batch',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.onHandQuantity).toBe(25); // 15 + 10
    expect(res.body.data.sku).toBe('TSHIRT-CREW-S-BLK');

    // Verify parent aggregate stock quantity is synchronized
    const parentProd = await Product.findById(testProduct._id);
    expect(parentProd?.stockQuantity).toBe(50); // 40 + 10

    // Verify movement record is linked to variant
    const movement = await InventoryMovement.findOne({
      sku: 'TSHIRT-CREW-S-BLK',
      movementType: InventoryMovementType.RESTOCK,
    });
    expect(movement?.variantId?.toString()).toBe(variantSmallId);
    expect(movement?.quantity).toBe(10);
  });

  it('should deduct stock specifically from a variant', async () => {
    const res = await testServer.request(`/api/v1/admin/inventory/${variantLargeId}/deduct`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        quantity: 5,
        reason: 'Damaged fabric detected during inspection',
        movementType: 'damaged_stock',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.onHandQuantity).toBe(20); // 25 - 5
    expect(res.body.data.sku).toBe('TSHIRT-CREW-L-BLK');

    // Verify parent total updated
    const parentProd = await Product.findById(testProduct._id);
    expect(parentProd?.stockQuantity).toBe(45); // 50 - 5
  });

  it('should reject operations on non-existent variation references', async () => {
    const fakeVariantId = new Types.ObjectId().toString();
    const res = await testServer.request(
      `/api/v1/admin/inventory/${testProduct._id.toString()}/receive?variantId=${fakeVariantId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 5,
          reason: 'Test non-existent variant',
        },
      }
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVENTORY_NOT_FOUND');
  });
});
