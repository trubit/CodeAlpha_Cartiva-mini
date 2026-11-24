import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { InventoryReservation } from '../../backend/src/models/InventoryReservation.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus } from '@shared/enums.js';

describe('Inventory Concurrency & Overselling Protection', () => {
  let testServer: TestServer;
  let customerToken: string;
  let testCategory: CategoryDocument;
  let limitedProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI ||
    'mongodb://localhost:27017/cartiva-mini-inventory-concurrency-test';

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
      firstName: 'Concurrent',
      lastName: 'Customer',
      email: 'concurrent@cartivamini.test',
      phone: '+2348022334450',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Limited Editions',
      slug: 'limited-editions-conc',
      isActive: true,
    });

    // Highly scarce item: Exactly 5 units in stock
    limitedProduct = await Product.create({
      title: 'Limited Edition Collectible Figure',
      name: 'Limited Edition Collectible Figure',
      slug: 'limited-edition-collectible-figure-conc',
      sku: 'FIGURE-LTD-001',
      shortDescription: 'Rare numbered collectible figure',
      fullDescription: 'Strictly limited collector edition piece.',
      regularPrice: 75000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 5,
      reservedQuantity: 0,
      lowStockThreshold: 2,
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

  it('should prevent overselling when 10 simultaneous requests compete for 5 remaining units', async () => {
    // 10 concurrent requests, each requesting 1 unit (Total requested: 10, Available: 5)
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      testServer.request('/api/v1/inventory/reservations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'x-session-id': `session-conc-${i}`,
        },
        body: {
          items: [
            {
              productId: limitedProduct._id.toString(),
              sku: 'FIGURE-LTD-001',
              quantity: 1,
            },
          ],
        },
      })
    );

    const results = await Promise.all(concurrentRequests);

    const successfulReservations = results.filter((r) => r.status === 201);
    const failedReservations = results.filter((r) => r.status === 400);

    // Exactly 5 must succeed, and exactly 5 must be rejected
    expect(successfulReservations.length).toBe(5);
    expect(failedReservations.length).toBe(5);

    // Failed requests must have INSUFFICIENT_STOCK code
    for (const failed of failedReservations) {
      expect(failed.body.error.code).toBe('INSUFFICIENT_STOCK');
    }

    // Verify database state: total reserved must not exceed 5
    const updatedProd = await Product.findById(limitedProduct._id);
    expect(updatedProd?.stockQuantity).toBe(5);
    expect(updatedProd?.reservedQuantity).toBe(5);
    expect((updatedProd?.stockQuantity ?? 0) - (updatedProd?.reservedQuantity ?? 0)).toBe(0);
  });

  it('should handle simultaneous identical idempotency requests safely', async () => {
    const sharedIdempotencyKey = 'idempotent-concurrent-key-9999';

    const idempotentProduct = await Product.create({
      title: 'Idempotent Test Item',
      name: 'Idempotent Test Item',
      slug: 'idempotent-test-item-conc',
      sku: 'ITEM-IDEM-001',
      shortDescription: 'Idempotent item',
      fullDescription: 'Idempotent item description',
      regularPrice: 20000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 10,
      reservedQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    // 5 concurrent requests with the identical idempotency key
    const duplicateRequests = Array.from({ length: 5 }, () =>
      testServer.request('/api/v1/inventory/reservations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [
            {
              productId: idempotentProduct._id.toString(),
              sku: 'ITEM-IDEM-001',
              quantity: 1,
            },
          ],
          idempotencyKey: sharedIdempotencyKey,
        },
      })
    );

    const results = await Promise.all(duplicateRequests);

    // All should return HTTP 201 or conflict resolution, pointing to the same reservation
    const reservationIds = results
      .filter((r) => r.status === 201)
      .map((r) => r.body.data.reservationId);

    // Ensure they all refer to the same reservation
    const uniqueIds = new Set(reservationIds);
    expect(uniqueIds.size).toBe(1);
  });

  it('should prevent overselling when 10 simultaneous requests compete for 3 remaining units of a product variation', async () => {
    const variantId = new Types.ObjectId();
    const variantProduct = await Product.create({
      title: 'Limited Edition Sneaker',
      name: 'Limited Edition Sneaker',
      slug: 'limited-edition-sneaker-conc',
      sku: 'SNK-LTD-MAIN',
      shortDescription: 'Limited sneaker',
      fullDescription: 'Limited edition high top sneaker.',
      regularPrice: 95000,
      currency: 'NGN',
      categoryId: testCategory._id,
      hasVariants: true,
      stockQuantity: 3,
      reservedQuantity: 0,
      variants: [
        {
          _id: variantId,
          sku: 'SNK-LTD-42-RED',
          title: 'Size 42 / Red',
          price: 95000,
          stockQuantity: 3,
          reservedQuantity: 0,
          lowStockThreshold: 1,
          isInventoryTracked: true,
        },
      ],
      status: ProductStatus.PUBLISHED,
    });

    // 10 concurrent requests, each requesting 1 unit of this specific variation (Available: 3)
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      testServer.request('/api/v1/inventory/reservations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'x-session-id': `session-var-conc-${i}`,
        },
        body: {
          items: [
            {
              productId: variantProduct._id.toString(),
              variantId: variantId.toString(),
              sku: 'SNK-LTD-42-RED',
              quantity: 1,
            },
          ],
        },
      })
    );

    const results = await Promise.all(concurrentRequests);

    const successfulReservations = results.filter((r) => r.status === 201);
    const failedReservations = results.filter((r) => r.status === 400);

    // Exactly 3 must succeed, and exactly 7 must be rejected
    expect(successfulReservations.length).toBe(3);
    expect(failedReservations.length).toBe(7);

    // Verify database state: variant and parent reservedQuantity must be exactly 3
    const updatedProd = await Product.findById(variantProduct._id);
    expect(updatedProd?.stockQuantity).toBe(3);
    expect(updatedProd?.reservedQuantity).toBe(3);
    const targetVariant = updatedProd?.variants?.[0];
    expect(targetVariant?.stockQuantity).toBe(3);
    expect(targetVariant?.reservedQuantity).toBe(3);
    expect((targetVariant?.stockQuantity ?? 0) - (targetVariant?.reservedQuantity ?? 0)).toBe(0);
  });

  it('should safely handle simultaneous release requests without double-releasing', async () => {
    // Create a fresh product for this test
    const testProd = await Product.create({
      title: 'Release Guard Product',
      name: 'Release Guard Product',
      slug: 'release-guard-prod-conc',
      sku: 'GUARD-REL-001',
      shortDescription: 'Release guard',
      fullDescription: 'Release guard test',
      regularPrice: 10000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 10,
      reservedQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    const reservationRes = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: testProd._id.toString(),
            sku: 'GUARD-REL-001',
            quantity: 4,
          },
        ],
      },
    });
    expect(reservationRes.status).toBe(201);
    const reservationId = reservationRes.body.data.reservationId;

    const prodMid = await Product.findById(testProd._id);
    expect(prodMid?.reservedQuantity).toBe(4);

    // 5 simultaneous release requests on the SAME reservation
    const simultaneousReleases = Array.from({ length: 5 }, () =>
      testServer.request(`/api/v1/inventory/reservations/${reservationId}/release`, {
        method: 'POST',
      })
    );

    const releaseResults = await Promise.all(simultaneousReleases);
    const successfulReleases = releaseResults.filter((r) => r.status === 200);
    const rejectedReleases = releaseResults.filter((r) => r.status === 400);

    // Exactly 1 must successfully transition from PENDING to RELEASED
    expect(successfulReleases.length).toBe(1);
    // The other 4 must be rejected with RESERVATION_ALREADY_RELEASED
    expect(rejectedReleases.length).toBe(4);

    // Verify reserved stock was decremented exactly once by 4, not 4*5
    const prodFinal = await Product.findById(testProd._id);
    expect(prodFinal?.reservedQuantity).toBe(0);
  });

  it('should cleanly rollback all prior reservations when a later item in a multi-item batch fails stock reservation', async () => {
    const itemA = await Product.create({
      title: 'Batch Product A',
      name: 'Batch Product A',
      slug: 'batch-product-a-conc',
      sku: 'BATCH-A-001',
      shortDescription: 'Product A for batch rollback test',
      fullDescription: 'Batch test product A',
      regularPrice: 5000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 10,
      reservedQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    const itemB = await Product.create({
      title: 'Batch Product B',
      name: 'Batch Product B',
      slug: 'batch-product-b-conc',
      sku: 'BATCH-B-001',
      shortDescription: 'Product B for batch rollback test',
      fullDescription: 'Batch test product B',
      regularPrice: 8000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 2,
      reservedQuantity: 2, // 0 available units
      status: ProductStatus.PUBLISHED,
    });

    // Attempt to reserve 3 of Item A (which is available) and 1 of Item B (which is NOT available)
    const res = await testServer.request('/api/v1/inventory/reservations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [
          {
            productId: itemA._id.toString(),
            sku: 'BATCH-A-001',
            quantity: 3,
          },
          {
            productId: itemB._id.toString(),
            sku: 'BATCH-B-001',
            quantity: 1,
          },
        ],
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Confirm Item A was rolled back or never held - reservedQuantity MUST be 0
    const finalItemA = await Product.findById(itemA._id);
    expect(finalItemA?.reservedQuantity).toBe(0);

    const finalItemB = await Product.findById(itemB._id);
    expect(finalItemB?.reservedQuantity).toBe(2);
  });
});
