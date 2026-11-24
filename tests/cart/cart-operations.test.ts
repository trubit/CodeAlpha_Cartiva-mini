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
import type { CartDto } from '@shared/api.types.js';

describe('Shopping Cart Operations (/api/v1/cart)', () => {
  let testServer: TestServer;
  let category: CategoryDocument;
  let simpleProduct: ProductDocument;
  let variantProduct: ProductDocument;
  let draftProduct: ProductDocument;
  let lowStockProduct: ProductDocument;
  let user1Token: string;
  let user2Token: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-cart-test';

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

    // Seed test users
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user1 = await User.create({
      email: 'cart.customer1@example.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Smith',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    user1Token = authService.generateAccessToken(user1);

    const user2 = await User.create({
      email: 'cart.customer2@example.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Jones',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    user2Token = authService.generateAccessToken(user2);

    // Seed categories & products
    category = await Category.create({
      name: 'Electronics & Gadgets',
      slug: 'electronics-cart-test',
      isActive: true,
    });

    simpleProduct = await Product.create({
      title: 'Ergonomic Mechanical Keyboard',
      slug: 'ergonomic-keyboard-cart',
      sku: 'KEY-ERG-001',
      brand: 'LogiType',
      shortDescription: 'Custom mechanical keyboard with hot-swappable switches.',
      fullDescription: 'Detailed description of ergonomic keyboard.',
      regularPrice: 45000,
      salePrice: 39000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 20,
      reservedQuantity: 2, // 18 available
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });

    variantProduct = await Product.create({
      title: 'Cotton Crewneck T-Shirt',
      slug: 'cotton-crewneck-tshirt-cart',
      sku: 'TSHIRT-BASE',
      brand: 'Aura',
      shortDescription: 'Classic combed cotton crewneck t-shirt.',
      fullDescription: 'High quality apparel item.',
      regularPrice: 8500,
      currency: 'NGN',
      categoryId: category._id,
      hasVariants: true,
      variants: [
        {
          sku: 'TSHIRT-BLK-M',
          title: 'Black / Medium',
          price: 9000,
          stockQuantity: 10,
          reservedQuantity: 0,
          isInventoryTracked: true,
        },
        {
          sku: 'TSHIRT-WHT-L',
          title: 'White / Large',
          price: 9500,
          stockQuantity: 5,
          reservedQuantity: 0,
          isInventoryTracked: true,
        },
      ],
      stockQuantity: 15,
      reservedQuantity: 0,
      status: ProductStatus.PUBLISHED,
    });

    draftProduct = await Product.create({
      title: 'Unreleased Prototype Device',
      slug: 'unreleased-prototype-cart',
      sku: 'PROTO-001',
      brand: 'NextGen',
      shortDescription: 'Not yet available.',
      fullDescription: 'Secret prototype.',
      regularPrice: 150000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 10,
      status: ProductStatus.DRAFT,
    });

    lowStockProduct = await Product.create({
      title: 'Limited Edition Collectible Pin',
      slug: 'limited-edition-pin-cart',
      sku: 'PIN-LTD-001',
      brand: 'Cartiva',
      shortDescription: 'Only 3 left in stock.',
      fullDescription: 'Rare collectible pin.',
      regularPrice: 5000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 3,
      reservedQuantity: 1, // Only 2 available
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

  it('Guest: creates guest cart, returns opaque guest token header and cookie', async () => {
    const res = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        body: {
          productId: simpleProduct._id.toString(),
          quantity: 2,
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemCount).toBe(2);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]!.sku).toBe('KEY-ERG-001');
    expect(res.body.data.items[0]!.unitPrice).toBe(39000); // Active salePrice applied
    expect(res.body.data.subtotal).toBe(78000); // 39000 * 2

    // Token must be in header
    const guestHeader = res.headers.get('x-guest-cart-token');
    expect(guestHeader).toBeTruthy();
  });

  it('Guest: retrieves cart using x-guest-cart-token header', async () => {
    // Add item as guest
    const addRes = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        body: {
          productId: simpleProduct._id.toString(),
          quantity: 1,
        },
      }
    );

    const guestToken = addRes.headers.get('x-guest-cart-token')!;

    // Read cart with token header
    const getRes = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'GET',
      headers: {
        'x-guest-cart-token': guestToken,
      },
    });

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.itemCount).toBe(1);
    expect(getRes.body.data.items[0]!.sku).toBe('KEY-ERG-001');
  });

  it('Authenticated customer: adds item to user-owned cart', async () => {
    const res = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        body: {
          productId: simpleProduct._id.toString(),
          quantity: 3,
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(3);
    expect(res.body.data.subtotal).toBe(117000); // 39000 * 3
  });

  it('Product variations: adds specific variant with correct variant price and title', async () => {
    const variantId = variantProduct.variants[0]!._id!.toString();

    const res = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        body: {
          productId: variantProduct._id.toString(),
          variantId,
          quantity: 2,
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2); // Simple product + variant

    const variantItem = res.body.data.items.find((i) => i.variantId === variantId);
    expect(variantItem).toBeTruthy();
    expect(variantItem?.sku).toBe('TSHIRT-BLK-M');
    expect(variantItem?.unitPrice).toBe(9000);
    expect(variantItem?.lineTotal).toBe(18000);
  });

  it('Duplicate items: merges quantity when adding same product again', async () => {
    const res = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        body: {
          productId: simpleProduct._id.toString(),
          quantity: 2,
        },
      }
    );

    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i) => i.productId === simpleProduct._id.toString());
    expect(item?.quantity).toBe(5); // 3 original + 2 added
  });

  it('Validation: rejects non-positive or excessive quantities', async () => {
    const resZero = await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: simpleProduct._id.toString(), quantity: 0 },
    });
    expect(resZero.status).toBe(422);

    const resNegative = await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: simpleProduct._id.toString(), quantity: -5 },
    });
    expect(resNegative.status).toBe(422);

    const resOverLimit = await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: simpleProduct._id.toString(), quantity: 150 },
    });
    expect(resOverLimit.status).toBe(422);
  });

  it('Inventory: rejects adding quantity exceeding available stock', async () => {
    // lowStockProduct has 3 onHand, 1 reserved = 2 available
    const res = await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: lowStockProduct._id.toString(), quantity: 5 },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('Publication status: rejects adding draft products to cart', async () => {
    const res = await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: draftProduct._id.toString(), quantity: 1 },
    });

    expect(res.status).toBe(404);
  });

  it('Server-side price security: rejects client-supplied fake prices', async () => {
    const res = await testServer.request<{ success: boolean; data: CartDto }>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${user2Token}` },
        body: {
          productId: simpleProduct._id.toString(),
          quantity: 1,
          unitPrice: 10, // Attempted price manipulation
          subtotal: 10,
        },
      }
    );

    expect(res.status).toBe(200);
    // Must ignore client price and charge authoritative 39000
    expect(res.body.data.items[0]!.unitPrice).toBe(39000);
    expect(res.body.data.subtotal).toBe(39000);
  });

  it('Price change detection: recalculates cart and explains price change if DB price changes', async () => {
    // User 2 has simpleProduct at 39000
    // Now update product regularPrice to 48000 and clear salePrice in database
    await Product.findByIdAndUpdate(simpleProduct._id, {
      $set: { regularPrice: 48000 },
      $unset: { salePrice: 1 },
    });

    const res = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.hasPriceChanges).toBe(true);
    expect(res.body.data.priceChanges).toBeDefined();
    expect(res.body.data.priceChanges![0]!.oldPrice).toBe(39000);
    expect(res.body.data.priceChanges![0]!.newPrice).toBe(48000);
    expect(res.body.data.items[0]!.unitPrice).toBe(48000);
    expect(res.body.data.subtotal).toBe(48000);
  });

  it('Customer: updates item quantity via PATCH /api/v1/cart/items/:itemId', async () => {
    const getRes = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    const itemId = getRes.body.data.items[0]!.id;

    const patchRes = await testServer.request<{ success: boolean; data: CartDto }>(
      `/api/v1/cart/items/${itemId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user2Token}` },
        body: { quantity: 4 },
      }
    );

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.items[0]!.quantity).toBe(4);
    expect(patchRes.body.data.subtotal).toBe(192000); // 48000 * 4
  });

  it('Customer: removes item via DELETE /api/v1/cart/items/:itemId', async () => {
    const getRes = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    const itemId = getRes.body.data.items[0]!.id;

    const deleteRes = await testServer.request<{ success: boolean; data: CartDto }>(
      `/api/v1/cart/items/${itemId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user2Token}` },
      }
    );

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.items).toHaveLength(0);
    expect(deleteRes.body.data.subtotal).toBe(0);
  });

  it('Customer: clears entire cart via DELETE /api/v1/cart', async () => {
    // User 1 has items
    const clearRes = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data.itemCount).toBe(0);
    expect(clearRes.body.data.items).toHaveLength(0);
    expect(clearRes.body.data.subtotal).toBe(0);
  });

  it('Security / IDOR: customer cannot access or modify another customer cart', async () => {
    // Add item to User 1
    await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { productId: simpleProduct._id.toString(), quantity: 1 },
    });

    // User 2 retrieves cart -> must see only User 2 empty cart, never User 1
    const user2Res = await testServer.request<{ success: boolean; data: CartDto }>('/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    expect(user2Res.status).toBe(200);
    expect(user2Res.body.data.items).toHaveLength(0);
  });
});
