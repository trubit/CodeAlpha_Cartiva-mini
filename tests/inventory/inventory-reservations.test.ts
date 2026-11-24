import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { InventoryReservation } from '../../backend/src/models/InventoryReservation.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus, ReservationStatus } from '@shared/enums.js';

describe('Inventory Reservation Foundation (/api/v1/inventory/reservations)', () => {
  let testServer: TestServer;
  let customerToken: string;
  let testCategory: CategoryDocument;
  let testProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-inventory-res-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await InventoryReservation.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const customer = await User.create({
      firstName: 'Shopper',
      lastName: 'Customer',
      email: 'shopper.res@cartivamini.test',
      phone: '+2348022334440',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Smart Watches',
      slug: 'smart-watches-res',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Fitness Tracker Watch',
      name: 'Fitness Tracker Watch',
      slug: 'fitness-tracker-watch-res',
      sku: 'WATCH-FIT-001',
      shortDescription: 'Smart fitness tracker watch',
      fullDescription: 'Water-resistant OLED fitness watch with heart rate sensor.',
      regularPrice: 35000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 10,
      reservedQuantity: 0,
      lowStockThreshold: 3,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await InventoryReservation.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should reserve available stock atomically for cart items', async () => {
    const res = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 3,
          },
        ],
        expiresInMinutes: 15,
        referenceType: 'cart',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservationId).toBeDefined();
    expect(res.body.data.status).toBe(ReservationStatus.PENDING);
    expect(res.body.data.items[0].quantity).toBe(3);

    // Verify reservedQuantity on Product document
    const updatedProd = await Product.findById(testProduct._id);
    expect(updatedProd?.stockQuantity).toBe(10); // Physical stock unchanged
    expect(updatedProd?.reservedQuantity).toBe(3); // Reserved stock incremented
  });

  it('should return existing reservation when idempotencyKey is supplied (idempotent)', async () => {
    const idempotencyKey = 'cart-checkout-reservation-key-unique-1234';

    const res1 = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 2,
          },
        ],
        idempotencyKey,
      },
    });
    expect(res1.status).toBe(201);
    const reservationId1 = res1.body.data.reservationId;

    // Second call with same idempotency key
    const res2 = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 2,
          },
        ],
        idempotencyKey,
      },
    });
    expect(res2.status).toBe(201);
    expect(res2.body.data.reservationId).toBe(reservationId1);

    // Total reserved quantity should NOT have doubled
    const prod = await Product.findById(testProduct._id);
    expect(prod?.reservedQuantity).toBe(5); // 3 from test 1 + 2 from test 2 (not 7)
  });

  it('should reject reservations that exceed remaining available stock', async () => {
    // Current onHand = 10, reserved = 5 => available = 5. Requesting 6 must fail.
    const res = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 6,
          },
        ],
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('should release an existing reservation and restore available stock', async () => {
    // First create reservation of 2 units
    const resCreate = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 2,
          },
        ],
      },
    });
    const reservationId = resCreate.body.data.reservationId;

    const prodBefore = await Product.findById(testProduct._id);
    expect(prodBefore?.reservedQuantity).toBe(7); // 5 + 2

    // Now release it
    const resRelease = await testServer.request(
      `/api/v1/inventory/reservations/${reservationId}/release`,
      {
        method: 'POST',
      }
    );

    expect(resRelease.status).toBe(200);
    expect(resRelease.body.data.status).toBe(ReservationStatus.RELEASED);

    const prodAfter = await Product.findById(testProduct._id);
    expect(prodAfter?.reservedQuantity).toBe(5); // 7 - 2
  });

  it('should reject releasing an already released reservation', async () => {
    // Create and release
    const resCreate = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      body: {
        items: [
          {
            productId: testProduct._id.toString(),
            sku: 'WATCH-FIT-001',
            quantity: 1,
          },
        ],
      },
    });
    const reservationId = resCreate.body.data.reservationId;

    await testServer.request(`/api/v1/inventory/reservations/${reservationId}/release`, {
      method: 'POST',
    });

    // Second release attempt
    const resSecondRelease = await testServer.request(
      `/api/v1/inventory/reservations/${reservationId}/release`,
      {
        method: 'POST',
      }
    );

    expect(resSecondRelease.status).toBe(400);
    expect(resSecondRelease.body.error.code).toBe('RESERVATION_ALREADY_RELEASED');
  });

  it('should handle auto-expiry for past-TTL reservations upon retrieval', async () => {
    // Create an expired reservation directly
    const expiredRes = await InventoryReservation.create({
      reservationId: 'res-test-expired-99',
      items: [
        {
          productId: testProduct._id,
          sku: 'WATCH-FIT-001',
          quantity: 2,
        },
      ],
      status: ReservationStatus.PENDING,
      expiresAt: new Date(Date.now() - 60000), // 1 minute in past
      referenceType: 'cart',
    });

    // Reserve hold on product
    await Product.findByIdAndUpdate(testProduct._id, { $inc: { reservedQuantity: 2 } });

    // Retrieve via GET endpoint
    const res = await testServer.request(
      `/api/v1/inventory/reservations/${expiredRes.reservationId}`,
      { method: 'GET' }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ReservationStatus.EXPIRED);

    // Verify hold was released back to product
    const updatedProd = await Product.findById(testProduct._id);
    expect(updatedProd?.reservedQuantity).toBe(5);
  });
});
