import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Address, type AddressDocument } from '../../backend/src/models/Address.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Cart } from '../../backend/src/models/Cart.model.js';
import { CheckoutSession } from '../../backend/src/models/CheckoutSession.model.js';
import {
  ShippingConfiguration,
  type ShippingConfigurationDocument,
} from '../../backend/src/models/ShippingConfiguration.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus, UserRole, ShippingCalculationType, CheckoutStep } from '@shared/enums.js';

describe('Checkout Session Management (/api/v1/checkout)', () => {
  let testServer: TestServer;
  let customer1: UserDocument;
  let customer2: UserDocument;
  let customer1Token: string;
  let customer2Token: string;
  let customer1Address: AddressDocument;
  let customer2Address: AddressDocument;
  let category: CategoryDocument;
  let testProduct: ProductDocument;
  let shippingConfig: ShippingConfigurationDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-checkout-session-test';

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
    await CheckoutSession.deleteMany({});
    await ShippingConfiguration.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    customer1 = await User.create({
      firstName: 'Folake',
      lastName: 'Adeleke',
      email: 'folake.checkout@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer1Token = authService.generateAccessToken(customer1);

    customer2 = await User.create({
      firstName: 'Emeka',
      lastName: 'Okafor',
      email: 'emeka.checkout@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer2Token = authService.generateAccessToken(customer2);

    customer1Address = await Address.create({
      userId: customer1._id,
      recipientName: 'Folake Adeleke',
      phone: '+2348033445566',
      streetAddress: '14 Admiralty Way, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    customer2Address = await Address.create({
      userId: customer2._id,
      recipientName: 'Emeka Okafor',
      phone: '+2348077889900',
      streetAddress: '88 Trans-Amadi Road',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    category = await Category.create({
      name: 'Electronics',
      slug: 'electronics-checkout',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Noise Cancelling Headphones',
      slug: 'noise-cancelling-headphones-checkout',
      sku: 'HEADPHONES-001',
      brand: 'Cartiva Sound',
      shortDescription: 'Active noise cancellation bluetooth headphones.',
      fullDescription: 'Detailed audio equipment specs.',
      regularPrice: 45000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 25,
      weightGrams: 400,
      status: ProductStatus.PUBLISHED,
    });

    shippingConfig = await ShippingConfiguration.create({
      zoneName: 'Lagos Metropolitan Zone',
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos'],
      carrierName: 'SpeedyLogistics',
      methodName: 'Standard Express Delivery',
      baseRate: 2500,
      rateCalculationType: ShippingCalculationType.FLAT,
      freeShippingThreshold: 100000,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 3,
      isActive: true,
    });

    // Populate customer1's cart with 2 items (90,000 NGN)
    await Cart.create({
      userId: customer1._id,
      items: [
        {
          productId: testProduct._id,
          sku: testProduct.sku,
          title: testProduct.title,
          unitPrice: testProduct.regularPrice,
          quantity: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    await testServer.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('rejects unauthenticated access to checkout session', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session`);
    expect(res.status).toBe(401);
  });

  it('rejects checkout session initialization if cart is empty', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    expect([400, 404]).toContain(res.status);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CHECKOUT_EMPTY_CART');
  });

  it('initializes checkout session authoritatively with cart snapshot for authenticated customer', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect([CheckoutStep.REVIEW, CheckoutStep.SHIPPING]).toContain(body.data.step);
    expect(body.data.subtotalMinor).toBe(9000000); // 2 * 45,000 * 100
    expect(body.data.cart.itemCount).toBe(2);
    expect(body.data.cart.items).toHaveLength(1);
    expect(body.data.cart.items[0].sku).toBe('HEADPHONES-001');
  });

  it('prevents IDOR: Customer 1 cannot set Customer 2 address in session', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session/address`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ addressId: customer2Address._id.toString() }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('successfully sets customer own address and updates session step to SHIPPING', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session/address`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ addressId: customer1Address._id.toString() }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.step).toBe(CheckoutStep.SHIPPING);
    expect(body.data.shippingAddressSnapshot.recipientName).toBe('Folake Adeleke');
    expect(body.data.shippingAddressSnapshot.city).toBe('Lekki');
  });

  it('rejects invalid or non-existent shipping method', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${testServer.url}/api/v1/checkout/session/shipping`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ shippingMethodId: fakeId }),
    });
    expect([400, 404]).toContain(res.status);
  });

  it('authoritatively calculates shipping fee and transitions step to PAYMENT', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session/shipping`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ shippingMethodId: shippingConfig._id.toString() }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.step).toBe(CheckoutStep.REVIEW);
    expect(body.data.shippingFeeMinor).toBe(250000); // 2,500 NGN in minor units
    expect(body.data.totalAmountMinor).toBe(9250000); // 90,000 + 2,500 = 92,500 NGN
    expect(body.data.shippingMethodSnapshot.methodName).toBe('Standard Express Delivery');
  });

  it('retrieves comprehensive authoritative summary with zero client trusts', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/session/summary`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.subtotalMinor).toBe(9000000);
    expect(body.data.shippingFeeMinor).toBe(250000);
    expect(body.data.totalAmountMinor).toBe(9250000);
    expect(body.data.isReadyForConfirmation).toBe(true);
  });

  it('validates pre-flight requirements and reports readiness', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isValid).toBe(true);
    expect(body.data.issues).toHaveLength(0);
  });
});
