import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Cart } from '../../backend/src/models/Cart.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus, UserRole } from '@shared/enums.js';
import type { CartMergeResponseDto, CartDto } from '@shared/api.types.js';

describe('Guest Cart to Customer Cart Merge (/api/v1/cart/merge)', () => {
  let testServer: TestServer;
  let category: CategoryDocument;
  let productA: ProductDocument;
  let productB: ProductDocument;
  let outOfStockProduct: ProductDocument;
  let userToken: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-cart-merge-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      email: 'merge.tester@example.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    userToken = authService.generateAccessToken(user);

    category = await Category.create({
      name: 'Apparel & Footwear',
      slug: 'apparel-footwear-merge',
      isActive: true,
    });

    productA = await Product.create({
      title: 'Canvas High-Top Sneakers',
      slug: 'canvas-high-top-sneakers-merge',
      sku: 'SNK-CAN-001',
      brand: 'WalkWise',
      shortDescription: 'Classic canvas high-top sneakers.',
      fullDescription: 'Comfortable durable shoes.',
      regularPrice: 22000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 25,
      reservedQuantity: 0,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });

    productB = await Product.create({
      title: 'Wool Beanie Hat',
      slug: 'wool-beanie-hat-merge',
      sku: 'HAT-WOL-001',
      brand: 'Aura',
      shortDescription: 'Warm ribbed wool knit beanie.',
      fullDescription: 'Premium wool beanie.',
      regularPrice: 7500,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 10,
      reservedQuantity: 0,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });

    outOfStockProduct = await Product.create({
      title: 'Vintage Leather Jacket (Sold Out)',
      slug: 'vintage-leather-jacket-sold-out-merge',
      sku: 'JKT-LEA-001',
      brand: 'Aura',
      shortDescription: 'Vintage leather jacket.',
      fullDescription: 'Sold out item.',
      regularPrice: 85000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 0,
      reservedQuantity: 0,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await mongoose.disconnect();
  });

  it('Merge: merges guest cart into authenticated customer cart correctly', async () => {
    // 1. Guest adds Product A (qty: 2) and Product B (qty: 1)
    const guestAddRes = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        body: {
          productId: productA._id.toString(),
          quantity: 2,
        },
      }
    );
    const guestToken = guestAddRes.headers.get('x-guest-cart-token')!;

    await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { 'x-guest-cart-token': guestToken },
      body: {
        productId: productB._id.toString(),
        quantity: 1,
      },
    });

    // 2. Customer already has Product A (qty: 1) in their authenticated cart
    await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        productId: productA._id.toString(),
        quantity: 1,
      },
    });

    // 3. Customer logs in and triggers merge
    const mergeRes = await testServer.request<{ success: boolean; data: CartMergeResponseDto }>(
      '/api/v1/cart/merge',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'x-guest-cart-token': guestToken,
        },
        body: {
          guestCartToken: guestToken,
        },
      }
    );

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);

    const { cart, mergeSummary } = mergeRes.body.data;
    expect(mergeSummary.updatedItemsCount).toBe(1); // Product A updated (1 + 2 = 3)
    expect(mergeSummary.mergedItemsCount).toBe(1); // Product B added (1)
    expect(mergeSummary.unavailableItemsCount).toBe(0);

    expect(cart.items).toHaveLength(2);

    const itemA = cart.items.find((i) => i.productId === productA._id.toString());
    expect(itemA?.quantity).toBe(3); // 1 (customer) + 2 (guest)

    const itemB = cart.items.find((i) => i.productId === productB._id.toString());
    expect(itemB?.quantity).toBe(1);

    // 4. Verify guest cart document was deleted in database
    const deletedGuestCart = await Cart.findOne({ sessionId: guestToken });
    expect(deletedGuestCart).toBeNull();
  });

  it('Merge: excludes out-of-stock items and returns clear warnings', async () => {
    // 1. Create new guest cart with out of stock product directly in DB to simulate stock depletion after adding
    const guestToken2 = 'guest-depleted-session-123';
    await Cart.create({
      sessionId: guestToken2,
      items: [
        {
          productId: outOfStockProduct._id,
          sku: outOfStockProduct.sku,
          title: outOfStockProduct.title,
          unitPrice: 85000,
          quantity: 1,
        },
      ],
      currency: 'NGN',
    });

    // 2. Merge into customer cart
    const mergeRes = await testServer.request<{ success: boolean; data: CartMergeResponseDto }>(
      '/api/v1/cart/merge',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: {
          guestCartToken: guestToken2,
        },
      }
    );

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.data.mergeSummary.unavailableItemsCount).toBe(1);
    expect(mergeRes.body.data.mergeSummary.warnings).toBeDefined();
    expect(mergeRes.body.data.mergeSummary.warnings![0]).toContain(
      'is out of stock and was excluded'
    );
  });

  it('Merge: requires authentication', async () => {
    const res = await testServer.request('/api/v1/cart/merge', {
      method: 'POST',
      body: {
        guestCartToken: 'some-token',
      },
    });

    expect(res.status).toBe(401);
  });
});
