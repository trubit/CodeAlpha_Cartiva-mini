import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../backend/src/app.js';
import { User, type UserDocument } from '../backend/src/models/User.model.js';
import { Product, type ProductDocument } from '../backend/src/models/Product.model.js';
import { Category } from '../backend/src/models/Category.model.js';
import { Cart } from '../backend/src/models/Cart.model.js';
import { Address } from '../backend/src/models/Address.model.js';
import { ShippingConfiguration } from '../backend/src/models/ShippingConfiguration.model.js';
import { authService } from '../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from './test-server.helper.js';
import { UserRole, ProductStatus, ShippingCalculationType } from '@shared/enums.js';
import { normalizeNigerianLocation } from '../backend/src/modules/shipping/location-normalizer.js';

describe('CRITICAL CARTIVA MINI REPAIR INTEGRATION VERIFICATION', () => {
  let testServer: TestServer;
  let adminUser: UserDocument;
  let customerUser: UserDocument;
  let adminToken: string;
  let customerToken: string;
  let testProduct: ProductDocument;
  let testAddressId: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-critical-repair-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await Address.deleteMany({});
    await ShippingConfiguration.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Create Admin User
    adminUser = await User.create({
      firstName: 'Trust',
      lastName: 'Admin',
      email: 'admin.repair@cartivamini.test',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(adminUser);

    // Create Customer User
    customerUser = await User.create({
      firstName: 'Trust',
      lastName: 'Customer',
      email: 'customer.repair@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customerUser);

    // Create Category & Product
    const category = await Category.create({
      name: 'Electronics & Computing',
      slug: 'electronics-computing',
      description: 'Computing hardware',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Laptop Pro 15',
      sku: 'LP-PRO-15',
      slug: 'laptop-pro-15',
      shortDescription: 'High performance laptop for development',
      fullDescription: 'Equipped with 32GB RAM and 1TB SSD.',
      regularPrice: 750000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 15,
      status: ProductStatus.PUBLISHED,
      images: [],
    });

    // Seed Shipping Configurations
    await ShippingConfiguration.create([
      {
        zoneName: 'Lagos Metropolitan Delivery',
        methodName: 'Standard Metro Delivery',
        carrierName: 'GIG Logistics',
        description: 'Next-day delivery across Lagos.',
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 2500,
        ratePerAdditionalKg: 0,
        freeShippingThreshold: 50000,
        estimatedDeliveryDaysMin: 1,
        estimatedDeliveryDaysMax: 2,
        countriesCovered: ['Nigeria'],
        statesCovered: ['Lagos'],
        currency: 'NGN',
        isActive: true,
      },
      {
        zoneName: 'South-South Regional Delivery (Port Harcourt)',
        methodName: 'Express Regional Dispatch',
        carrierName: 'Speedaf Express',
        description: 'Direct door-to-door deliveries in Port Harcourt and Rivers State.',
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 4500,
        ratePerAdditionalKg: 500,
        freeShippingThreshold: 60000,
        estimatedDeliveryDaysMin: 2,
        estimatedDeliveryDaysMax: 4,
        countriesCovered: ['Nigeria'],
        statesCovered: ['Rivers', 'Delta', 'Bayelsa', 'Akwa Ibom', 'Cross River', 'Edo'],
        currency: 'NGN',
        isActive: true,
      },
      {
        zoneName: 'North-Central & FCT Zone (Abuja)',
        methodName: 'Standard Regional Dispatch',
        carrierName: 'DHL Express Nigeria',
        description: 'Swift delivery across Abuja FCT.',
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 3800,
        ratePerAdditionalKg: 400,
        freeShippingThreshold: 55000,
        estimatedDeliveryDaysMin: 2,
        estimatedDeliveryDaysMax: 3,
        countriesCovered: ['Nigeria'],
        statesCovered: ['FCT - Abuja', 'Nasarawa', 'Niger', 'Kogi', 'Plateau', 'Benue', 'Kwara'],
        currency: 'NGN',
        isActive: true,
      },
      {
        zoneName: 'Nationwide Delivery Coverage',
        methodName: 'Nationwide Standard Courier',
        carrierName: 'FedEx / Red Star Express',
        description: 'Delivery to all Nigerian states.',
        rateCalculationType: ShippingCalculationType.WEIGHT_TIERED,
        baseRate: 5500,
        ratePerAdditionalKg: 600,
        freeShippingThreshold: 75000,
        estimatedDeliveryDaysMin: 3,
        estimatedDeliveryDaysMax: 6,
        countriesCovered: ['Nigeria'],
        statesCovered: ['*'],
        currency: 'NGN',
        isActive: true,
      },
    ]);

    // Create Port Harcourt Address for Customer
    const address = await Address.create({
      userId: customerUser._id,
      recipientName: 'Trust Ezika',
      phone: '+2347037643440',
      streetAddress: 'No 4 Avenue Greenland Estate Rumunduru',
      city: 'Port Harcourt',
      state: 'Rivers',
      postalCode: '500272',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });
    testAddressId = address._id.toString();

    // Create Cart for Customer
    await Cart.create({
      userId: customerUser._id,
      items: [
        {
          id: new mongoose.Types.ObjectId().toString(),
          productId: testProduct._id,
          title: testProduct.title,
          sku: testProduct.sku,
          unitPrice: testProduct.regularPrice,
          unitPriceMinor: testProduct.regularPrice * 100,
          quantity: 1,
          lineTotalMinor: testProduct.regularPrice * 100,
          currency: 'NGN',
          thumbnailUrl: '',
          weightKg: 2.0,
        },
      ],
      subtotalMinor: testProduct.regularPrice * 100,
      itemCount: 1,
      currency: 'NGN',
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await Address.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  // ==========================================================================
  // PART 2: PRODUCT IMAGE UPLOAD & REPLACEMENT TESTS
  // ==========================================================================
  describe('Part 2 — Product Image Upload & Replacement', () => {
    it('should reject unauthenticated product image upload with 401 UNAUTHORIZED', async () => {
      const res = await testServer.request(
        `/api/v1/admin/products/${testProduct._id.toString()}/images`,
        {
          method: 'POST',
        }
      );
      expect(res.status).toBe(401);
      const body = res.body as { error: { message: string } };
      expect(body.error.message).toContain('Authentication credentials are required');
    });

    it('should reject non-admin users with 403 FORBIDDEN', async () => {
      const res = await testServer.request(
        `/api/v1/admin/products/${testProduct._id.toString()}/images`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${customerToken}` },
        }
      );
      expect(res.status).toBe(403);
    });

    it('should successfully upload product image with authenticated admin token', async () => {
      const validPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(validPngBase64, 'base64');

      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('image', blob, 'laptop-pro.png');
      formData.append('isThumbnail', 'true');
      formData.append('alt', 'Laptop Pro 15 Display');

      const res = await fetch(
        `${testServer.url}/api/v1/admin/products/${testProduct._id.toString()}/images`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        }
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { images: Array<{ url: string }> } };
      expect(body.success).toBe(true);
      expect(body.data.images.length).toBeGreaterThanOrEqual(1);
      expect(body.data.images[0]?.url).toBeDefined();
    });

    it('should successfully replace an existing product image', async () => {
      const validPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(validPngBase64, 'base64');

      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('image', blob, 'laptop-pro-replacement.png');
      formData.append('isThumbnail', 'true');
      formData.append('alt', 'Laptop Pro 15 Replaced Display');

      const res = await fetch(
        `${testServer.url}/api/v1/admin/products/${testProduct._id.toString()}/images`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        }
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { images: Array<{ url: string }> } };
      expect(body.success).toBe(true);
      expect(body.data.images.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // PART 3: CHECKOUT AUTHENTICATION TESTS
  // ==========================================================================
  describe('Part 3 — Checkout Authentication & Session Flow', () => {
    it('should reject unauthenticated checkout session request with 401 UNAUTHORIZED', async () => {
      const res = await testServer.request('/api/v1/checkout/session', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
      const body = res.body as { error: { message: string } };
      expect(body.error.message).toContain('Authentication credentials are required');
    });

    it('should successfully retrieve/create checkout session for authenticated customer', async () => {
      const res = await testServer.request('/api/v1/checkout/session', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { sessionId: string; subtotal: number } };
      expect(body.success).toBe(true);
      expect(body.data.sessionId).toBeDefined();
      expect(body.data.subtotal).toBe(750000);
    });

    it('should allow customer to select Port Harcourt delivery address', async () => {
      const res = await testServer.request('/api/v1/checkout/session/address', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { addressId: testAddressId },
      });

      expect(res.status).toBe(200);
      const body = res.body as {
        success: boolean;
        data: { shippingAddressSnapshot: { city: string; state: string } };
      };
      expect(body.success).toBe(true);
      expect(body.data.shippingAddressSnapshot.city).toBe('Port Harcourt');
      expect(body.data.shippingAddressSnapshot.state).toBe('Rivers');
    });
  });

  // ==========================================================================
  // PART 4: SHIPPING ADDRESS & LOCATION NORMALIZATION TESTS
  // ==========================================================================
  describe('Part 4 — Nigerian Location Normalizer & Shipping Availability', () => {
    it('should normalize Port Harcourt variations to canonical Port Harcourt, Rivers State', () => {
      const result1 = normalizeNigerianLocation('Rivers State', 'portharcourt');
      expect(result1.city).toBe('Port Harcourt');
      expect(result1.state).toBe('Rivers');
      expect(result1.isRecognizedState).toBe(true);

      const result2 = normalizeNigerianLocation('River State', 'Port Harcourt');
      expect(result2.city).toBe('Port Harcourt');
      expect(result2.state).toBe('Rivers');

      const result3 = normalizeNigerianLocation(
        'Lagos',
        'portharcourt',
        'No 4 Avenue Greenland Estate Rumunduru Portharcourt River State Nigeria'
      );
      expect(result3.city).toBe('Port Harcourt');
      expect(result3.state).toBe('Rivers');
    });

    it('should retrieve shipping methods for Port Harcourt without Lagos fallback', async () => {
      const res = await testServer.request(
        '/api/v1/shipping/methods?country=Nigeria&state=Rivers',
        {
          method: 'GET',
        }
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: Array<{ zoneName: string; baseRate: number }> };
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const zoneNames = body.data.map((m) => m.zoneName);
      expect(zoneNames.some((z) => z.includes('South-South') || z.includes('Nationwide'))).toBe(true);
      expect(zoneNames.some((z) => z.includes('Lagos'))).toBe(false);
    });

    it('should retrieve shipping methods for Lagos State accurately', async () => {
      const res = await testServer.request(
        '/api/v1/shipping/methods?country=Nigeria&state=Lagos',
        {
          method: 'GET',
        }
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: Array<{ zoneName: string }> };
      expect(body.success).toBe(true);
      const zoneNames = body.data.map((m) => m.zoneName);
      expect(zoneNames.some((z) => z.includes('Lagos'))).toBe(true);
    });

    it('should retrieve shipping methods for Abuja FCT accurately', async () => {
      const res = await testServer.request(
        '/api/v1/shipping/methods?country=Nigeria&state=FCT%20-%20Abuja',
        {
          method: 'GET',
        }
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: Array<{ zoneName: string }> };
      expect(body.success).toBe(true);
      const zoneNames = body.data.map((m) => m.zoneName);
      expect(zoneNames.some((z) => z.includes('North-Central') || z.includes('Abuja'))).toBe(true);
    });

    it('should reject unrecognized state with explicit error, never mentioning Lagos', async () => {
      const res = await testServer.request(
        '/api/v1/shipping/availability?country=Nigeria&state=InvalidFakeRegion',
        {
          method: 'GET',
        }
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { isAvailable: boolean; message: string } };
      expect(body.success).toBe(true);
      expect(body.data.isAvailable).toBe(false);
      expect(body.data.message).not.toContain('Lagos');
      expect(body.data.message).toContain('InvalidFakeRegion');
    });
  });
});
