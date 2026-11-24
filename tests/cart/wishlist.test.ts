import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Wishlist } from '../../backend/src/models/Wishlist.model.js';
import { Cart } from '../../backend/src/models/Cart.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus, UserRole } from '@shared/enums.js';
import type { WishlistDto, CartDto } from '@shared/api.types.js';

describe('Customer Wishlist Management (/api/v1/wishlist)', () => {
  let testServer: TestServer;
  let category: CategoryDocument;
  let product1: ProductDocument;
  let product2: ProductDocument;
  let draftProduct: ProductDocument;
  let customer1Token: string;
  let customer2Token: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-wishlist-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Wishlist.deleteMany({});
    await Cart.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user1 = await User.create({
      email: 'wishlist.user1@example.com',
      passwordHash,
      firstName: 'Diana',
      lastName: 'Prince',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer1Token = authService.generateAccessToken(user1);

    const user2 = await User.create({
      email: 'wishlist.user2@example.com',
      passwordHash,
      firstName: 'Bruce',
      lastName: 'Wayne',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer2Token = authService.generateAccessToken(user2);

    category = await Category.create({
      name: 'Smart Home & Living',
      slug: 'smart-home-living-wishlist',
      isActive: true,
    });

    product1 = await Product.create({
      title: 'Smart Ambient LED Light Strip',
      slug: 'smart-ambient-led-light-strip-wishlist',
      sku: 'LED-AMB-001',
      brand: 'Lumina',
      shortDescription: 'Color changing Wi-Fi controlled light strip.',
      fullDescription: 'Smart lighting system.',
      regularPrice: 18500,
      salePrice: 15000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 30,
      status: ProductStatus.PUBLISHED,
    });

    product2 = await Product.create({
      title: 'Wireless Security Camera HD',
      slug: 'wireless-security-camera-hd-wishlist',
      sku: 'CAM-SEC-002',
      brand: 'SafeHome',
      shortDescription: '1080p indoor night-vision camera.',
      fullDescription: 'Indoor security camera.',
      regularPrice: 32000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 12,
      status: ProductStatus.PUBLISHED,
    });

    draftProduct = await Product.create({
      title: 'Hidden Smart Lock Prototype',
      slug: 'hidden-smart-lock-prototype-wishlist',
      sku: 'LCK-PROTO-003',
      brand: 'SafeHome',
      shortDescription: 'Draft item.',
      fullDescription: 'Unpublished prototype.',
      regularPrice: 45000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 5,
      status: ProductStatus.DRAFT,
    });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Wishlist.deleteMany({});
    await Cart.deleteMany({});
    await mongoose.disconnect();
  });

  it('Customer: adds product to wishlist', async () => {
    const res = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist/items',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { productId: product1._id.toString() },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemCount).toBe(1);
    expect(res.body.data.items[0]!.sku).toBe('LED-AMB-001');
    expect(res.body.data.items[0]!.currentPrice).toBe(15000); // Authoritative sale price
    expect(res.body.data.items[0]!.isAvailable).toBe(true);
  });

  it('Deduplication: adding duplicate product is idempotent', async () => {
    const res = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist/items',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { productId: product1._id.toString() },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(1);
  });

  it('Customer: retrieves full wishlist with live pricing and availability', async () => {
    // Add product 2
    await testServer.request('/api/v1/wishlist/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { productId: product2._id.toString() },
    });

    const res = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${customer1Token}` },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(2);
    expect(res.body.data.items.some((i) => i.sku === 'LED-AMB-001')).toBe(true);
    expect(res.body.data.items.some((i) => i.sku === 'CAM-SEC-002')).toBe(true);
  });

  it('Customer: moves wishlist item into shopping cart', async () => {
    const getRes = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${customer1Token}` },
      }
    );

    const itemToMove = getRes.body.data.items.find((i) => i.sku === 'LED-AMB-001')!;

    const moveRes = await testServer.request<{
      success: boolean;
      data: { cart: CartDto; wishlist: WishlistDto };
    }>(`/api/v1/wishlist/items/${itemToMove.id}/move-to-cart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { quantity: 1 },
    });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.success).toBe(true);

    // Cart must now contain the item
    expect(moveRes.body.data.cart.items.some((i) => i.sku === 'LED-AMB-001')).toBe(true);

    // Wishlist must no longer contain the item
    expect(moveRes.body.data.wishlist.items.some((i) => i.sku === 'LED-AMB-001')).toBe(false);
    expect(moveRes.body.data.wishlist.itemCount).toBe(1); // Only product2 left
  });

  it('Customer: removes product from wishlist via DELETE /api/v1/wishlist/items/:itemId', async () => {
    const getRes = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${customer1Token}` },
      }
    );

    const remainingItem = getRes.body.data.items[0]!;

    const delRes = await testServer.request<{ success: boolean; data: WishlistDto }>(
      `/api/v1/wishlist/items/${remainingItem.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customer1Token}` },
      }
    );

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.itemCount).toBe(0);
    expect(delRes.body.data.items).toHaveLength(0);
  });

  it('Publication: rejects adding draft products to wishlist', async () => {
    const res = await testServer.request('/api/v1/wishlist/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { productId: draftProduct._id.toString() },
    });

    expect(res.status).toBe(404);
  });

  it('Security: unauthenticated customer cannot access wishlist', async () => {
    const res = await testServer.request('/api/v1/wishlist', {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });

  it('Security / IDOR: customer cannot view or modify another customer wishlist', async () => {
    // Add product to Customer 2
    await testServer.request('/api/v1/wishlist/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: { productId: product2._id.toString() },
    });

    // Customer 1 retrieves wishlist -> must see Customer 1's empty wishlist
    const res = await testServer.request<{ success: boolean; data: WishlistDto }>(
      '/api/v1/wishlist',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${customer1Token}` },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(0);
  });
});
