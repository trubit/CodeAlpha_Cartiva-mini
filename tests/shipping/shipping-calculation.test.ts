import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Address, type AddressDocument } from '../../backend/src/models/Address.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Cart } from '../../backend/src/models/Cart.model.js';
import { ShippingConfiguration } from '../../backend/src/models/ShippingConfiguration.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus, UserRole, ShippingCalculationType } from '@shared/enums.js';
import type {
  ShippingQuoteResponseDto,
  ShippingAvailabilityDto,
  ShippingMethodDto,
} from '@shared/api.types.js';

describe('Shipping & Delivery Calculation (/api/v1/shipping)', () => {
  let testServer: TestServer;
  let customer1: UserDocument;
  let customer2: UserDocument;
  let customer1Token: string;
  let customer2Token: string;
  let customer1Address: AddressDocument;
  let customer2Address: AddressDocument;
  let category: CategoryDocument;
  let testProductLight: ProductDocument;
  let testProductHeavy: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-shipping-calc-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await ShippingConfiguration.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    // Seed test users
    const passwordHash = await bcrypt.hash('Password123!', 10);
    customer1 = await User.create({
      firstName: 'Tunde',
      lastName: 'Bakare',
      email: 'tunde.shipping@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer1Token = authService.generateAccessToken(customer1);

    customer2 = await User.create({
      firstName: 'Amaka',
      lastName: 'Eze',
      email: 'amaka.shipping@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer2Token = authService.generateAccessToken(customer2);

    // Seed addresses
    customer1Address = await Address.create({
      userId: customer1._id,
      recipientName: 'Tunde Bakare',
      phone: '+2348011223344',
      streetAddress: '12 Victoria Island Boulevard',
      apartmentSuite: 'Flat 3',
      city: 'Victoria Island',
      state: 'Lagos',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    customer2Address = await Address.create({
      userId: customer2._id,
      recipientName: 'Amaka Eze',
      phone: '+2348055667788',
      streetAddress: '45 Garki District Road',
      city: 'Abuja',
      state: 'FCT - Abuja',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    // Seed product category & products
    category = await Category.create({
      name: 'Home & Living',
      slug: 'home-and-living-shipping',
      isActive: true,
    });

    testProductLight = await Product.create({
      title: 'Silk Pillowcase Set',
      slug: 'silk-pillowcase-shipping',
      sku: 'SILK-PIL-001',
      brand: 'Cartiva Sanctuary',
      shortDescription: '100% mulberry silk pillowcase set.',
      fullDescription: 'Long detailed description.',
      regularPrice: 15000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 50,
      weightGrams: 300, // 0.3 kg
      status: ProductStatus.PUBLISHED,
    });

    testProductHeavy = await Product.create({
      title: 'Cast Iron Kettle & Ceramic Mug',
      slug: 'cast-iron-kettle-shipping',
      sku: 'KETTLE-001',
      brand: 'Cartiva Living',
      shortDescription: 'Japanese inspired heavy cast iron kettle.',
      fullDescription: 'Long detailed description.',
      regularPrice: 35000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 20,
      weightGrams: 3500, // 3.5 kg
      status: ProductStatus.PUBLISHED,
    });

    // Seed active shipping configurations
    // 1. Lagos Standard Delivery (Flat rate ₦2,500, free over ₦50,000)
    await ShippingConfiguration.create({
      zoneName: 'Lagos Metropolitan Zone',
      methodName: 'Standard Delivery',
      carrierName: 'Cartiva Direct Courier',
      description: 'Reliable direct doorstep delivery within Lagos.',
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
    });

    // 2. Lagos Express Delivery (Flat rate ₦4,500, no free delivery)
    await ShippingConfiguration.create({
      zoneName: 'Lagos Metropolitan Zone',
      methodName: 'Express Same-Day Courier',
      carrierName: 'GIG Logistics Express',
      description: 'Priority courier with fast-track processing.',
      rateCalculationType: ShippingCalculationType.FLAT,
      baseRate: 4500,
      ratePerAdditionalKg: 0,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 1,
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos'],
      currency: 'NGN',
      isActive: true,
    });

    // 3. Nationwide Regional Delivery (Weight-tiered, base ₦3,500 + ₦500 per additional kg over 1kg)
    await ShippingConfiguration.create({
      zoneName: 'Nationwide Regional Zone',
      methodName: 'Regional Freight Delivery',
      carrierName: 'DHL Express Nigeria',
      description: 'Nationwide coverage for regional hubs.',
      rateCalculationType: ShippingCalculationType.WEIGHT_TIERED,
      baseRate: 3500,
      ratePerAdditionalKg: 500,
      freeShippingThreshold: 75000,
      estimatedDeliveryDaysMin: 3,
      estimatedDeliveryDaysMax: 5,
      countriesCovered: ['Nigeria'],
      statesCovered: ['FCT - Abuja', 'Rivers', 'Oyo', 'Kano', 'Kaduna'],
      currency: 'NGN',
      isActive: true,
    });

    // 4. Inactive Shipping Method (Should NEVER be returned)
    await ShippingConfiguration.create({
      zoneName: 'Suspended Zone',
      methodName: 'Inactive Promo Shipping',
      carrierName: 'Promo Express',
      rateCalculationType: ShippingCalculationType.FLAT,
      baseRate: 500,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 2,
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos'],
      currency: 'NGN',
      isActive: false,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  // ==========================================================================
  // Availability Checks
  // ==========================================================================

  it('should confirm availability for supported location (Lagos)', async () => {
    const res = await testServer.request(
      '/api/v1/shipping/availability?country=Nigeria&state=Lagos',
      {
        method: 'GET',
      }
    );

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingAvailabilityDto };
    expect(body.success).toBe(true);
    expect(body.data.isAvailable).toBe(true);
    expect(body.data.supportedMethodsCount).toBe(2);
    expect(body.data.availableMethods.map((m) => m.methodName)).toContain('Standard Delivery');
    expect(body.data.availableMethods.map((m) => m.methodName)).toContain(
      'Express Same-Day Courier'
    );
  });

  it('should indicate delivery is unavailable for unsupported location', async () => {
    const res = await testServer.request(
      '/api/v1/shipping/availability?country=Nigeria&state=UnknownState',
      {
        method: 'GET',
      }
    );

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingAvailabilityDto };
    expect(body.success).toBe(true);
    expect(body.data.isAvailable).toBe(false);
    expect(body.data.supportedMethodsCount).toBe(0);
    expect(body.data.availableMethods).toHaveLength(0);
  });

  it('should reject availability request without state parameter', async () => {
    const res = await testServer.request('/api/v1/shipping/availability?country=Nigeria', {
      method: 'GET',
    });

    expect(res.status).toBe(422);
  });

  // ==========================================================================
  // Shipping Methods List
  // ==========================================================================

  it('should list only active shipping methods for destination', async () => {
    const res = await testServer.request('/api/v1/shipping/methods?country=Nigeria&state=Lagos', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingMethodDto[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    const methodNames = body.data.map((m) => m.methodName);
    expect(methodNames).not.toContain('Inactive Promo Shipping');
  });

  // ==========================================================================
  // Shipping Quote Calculation & Business Rules
  // ==========================================================================

  it('should calculate standard flat-rate quote for guest destination', async () => {
    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      body: {
        destination: {
          country: 'Nigeria',
          state: 'Lagos',
          city: 'Ikeja',
        },
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingQuoteResponseDto };
    expect(body.success).toBe(true);
    expect(body.data.isDeliverable).toBe(true);
    expect(body.data.quotes).toHaveLength(2);

    const standardQuote = body.data.quotes.find((q) => q.methodName === 'Standard Delivery');
    expect(standardQuote).toBeDefined();
    expect(standardQuote?.fee).toBe(2500);
    expect(standardQuote?.feeMinor).toBe(250000);
    expect(standardQuote?.isFreeShipping).toBe(false);
  });

  it('should calculate weight-tiered quote for regional destination', async () => {
    // Put heavy product in customer2 cart (3.5 kg)
    await Cart.create({
      userId: customer2._id,
      items: [
        {
          productId: testProductHeavy._id,
          sku: testProductHeavy.sku,
          title: testProductHeavy.title,
          unitPrice: testProductHeavy.regularPrice,
          quantity: 1,
          priceSnapshot: testProductHeavy.regularPrice,
          priceSnapshotMinor: testProductHeavy.regularPrice * 100,
          currency: 'NGN',
          addedAt: new Date(),
        },
      ],
      currency: 'NGN',
    });

    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: {
        addressId: customer2Address._id.toString(),
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingQuoteResponseDto };
    expect(body.success).toBe(true);
    expect(body.data.destination.state).toBe('FCT - Abuja');

    // Heavy product weight = 3.5 kg -> additional kg = ceil(3.5 - 1) = 3 kg
    // Base rate: 3,500 + 3 * 500 = 5,000 NGN (500,000 minor units)
    const quote = body.data.quotes[0]!;
    expect(quote.methodName).toBe('Regional Freight Delivery');
    expect(quote.fee).toBe(5000);
    expect(quote.feeMinor).toBe(500000);
    expect(quote.isFreeShipping).toBe(false);
    expect(quote.estimatedDeliveryText).toBe('3–5 business days');
  });

  it('should award free delivery when cart subtotal meets freeShippingThreshold', async () => {
    // Put items totaling ₦70,000 in customer1 cart (threshold for Lagos standard is ₦50,000)
    await Cart.create({
      userId: customer1._id,
      items: [
        {
          productId: testProductHeavy._id,
          sku: testProductHeavy.sku,
          title: testProductHeavy.title,
          unitPrice: testProductHeavy.regularPrice,
          quantity: 2, // 2 x 35,000 = 70,000
          priceSnapshot: testProductHeavy.regularPrice,
          priceSnapshotMinor: testProductHeavy.regularPrice * 100,
          currency: 'NGN',
          addedAt: new Date(),
        },
      ],
      currency: 'NGN',
    });

    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        addressId: customer1Address._id.toString(),
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingQuoteResponseDto };
    expect(body.success).toBe(true);

    const standardQuote = body.data.quotes.find((q) => q.methodName === 'Standard Delivery');
    expect(standardQuote?.fee).toBe(0);
    expect(standardQuote?.feeMinor).toBe(0);
    expect(standardQuote?.isFreeShipping).toBe(true);
    expect(standardQuote?.qualifiesForFreeShipping).toBe(true);

    // Express delivery does NOT have free shipping configured, so it remains full price
    const expressQuote = body.data.quotes.find((q) => q.methodName === 'Express Same-Day Courier');
    expect(expressQuote?.fee).toBe(4500);
    expect(expressQuote?.isFreeShipping).toBe(false);
  });

  it('should calculate shipping quote using custom items payload', async () => {
    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      body: {
        destination: {
          country: 'Nigeria',
          state: 'Lagos',
          city: 'Lekki',
        },
        items: [
          {
            productId: testProductLight._id.toString(),
            quantity: 2,
            unitPrice: testProductLight.regularPrice,
            weightGrams: testProductLight.weightGrams,
          },
        ],
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingQuoteResponseDto };
    expect(body.success).toBe(true);
    expect(body.data.quotes.length).toBeGreaterThan(0);
  });

  // ==========================================================================
  // Security & Address Ownership Validation
  // ==========================================================================

  it('should forbid customer1 from calculating quotes using customer2 private address', async () => {
    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        addressId: customer2Address._id.toString(), // Customer 2 address ID passed by Customer 1
      },
    });

    expect(res.status).toBe(403);
    const body = res.body as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ADDRESS_ACCESS_DENIED');
  });

  it('should return 404 if address does not exist', async () => {
    const randomObjectId = new mongoose.Types.ObjectId().toString();
    const res = await testServer.request('/api/v1/shipping/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        addressId: randomObjectId,
      },
    });

    expect(res.status).toBe(404);
    const body = res.body as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ADDRESS_NOT_FOUND');
  });
});
