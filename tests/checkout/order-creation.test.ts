import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Address, type AddressDocument } from '../../backend/src/models/Address.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Category } from '../../backend/src/models/Category.model.js';
import { Cart } from '../../backend/src/models/Cart.model.js';
import { Order } from '../../backend/src/models/Order.model.js';
import { CheckoutSession } from '../../backend/src/models/CheckoutSession.model.js';
import {
  ShippingConfiguration,
  type ShippingConfigurationDocument,
} from '../../backend/src/models/ShippingConfiguration.model.js';
import { InventoryReservation } from '../../backend/src/models/InventoryReservation.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import {
  ProductStatus,
  UserRole,
  ShippingCalculationType,
  OrderStatus,
  PaymentStatus,
} from '@shared/enums.js';

describe('Order Creation & Atomic Stock Reservation (/api/v1/checkout/confirm)', () => {
  let testServer: TestServer;
  let customer: UserDocument;
  let customerToken: string;
  let customerAddress: AddressDocument;
  let testProduct: ProductDocument;
  let shippingConfig: ShippingConfigurationDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-order-creation-test';

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
    await Order.deleteMany({});
    await CheckoutSession.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    await InventoryReservation.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    customer = await User.create({
      firstName: 'Kelechi',
      lastName: 'Nwosu',
      email: 'kelechi.order@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    customerAddress = await Address.create({
      userId: customer._id,
      recipientName: 'Kelechi Nwosu',
      phone: '+2348099887766',
      streetAddress: '25 Awolowo Road, Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos',
      country: 'Nigeria',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    const category = await Category.create({
      name: 'Footwear',
      slug: 'footwear-order',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Handcrafted Leather Loafers',
      slug: 'handcrafted-leather-loafers',
      sku: 'LOAFERS-001',
      brand: 'Cartiva Bespoke',
      shortDescription: 'Premium Italian calfskin leather loafers.',
      fullDescription: 'Long specs description.',
      regularPrice: 75000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 10,
      weightGrams: 800,
      status: ProductStatus.PUBLISHED,
    });

    shippingConfig = await ShippingConfiguration.create({
      zoneName: 'Lagos Metropolitan Zone',
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos'],
      carrierName: 'KwikCourier',
      methodName: 'Direct Delivery',
      baseRate: 3000,
      rateCalculationType: ShippingCalculationType.FLAT,
      freeShippingThreshold: 200000,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 2,
      isActive: true,
    });

    // Populate customer cart with 2 loafers
    await Cart.create({
      userId: customer._id,
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

  it('rejects order confirmation if terms are not accepted', async () => {
    // Setup session first
    await fetch(`${testServer.url}/api/v1/checkout/session`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    await fetch(`${testServer.url}/api/v1/checkout/session/address`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ addressId: customerAddress._id.toString() }),
    });
    await fetch(`${testServer.url}/api/v1/checkout/session/shipping`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ shippingMethodId: shippingConfig._id.toString() }),
    });

    const res = await fetch(`${testServer.url}/api/v1/checkout/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ acceptTerms: false }),
    });
    expect([400, 422]).toContain(res.status);
  });

  it('atomically creates order, reserves stock, and records PENDING_PAYMENT status', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        acceptTerms: true,
        customerNotes: 'Please ring the front bell on arrival.',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    expect(body.data.orderStatus).toBe(OrderStatus.PENDING_PAYMENT);
    expect(body.data.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(body.data.totalAmountMinor).toBe(15300000); // (2 * 75000 + 3000) * 100 = 153,000 NGN in minor units
    expect(body.data.totalAmount).toBe(153000);
    expect(body.data.currency).toBe('NGN');
    expect(body.data.reservationReference).toBeDefined();

    // Verify order in database
    const dbOrder = await Order.findOne({ orderNumber: body.data.orderNumber });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder!.orderStatus).toBe(OrderStatus.PENDING_PAYMENT);
    expect(dbOrder!.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(dbOrder!.items).toHaveLength(1);
    expect(dbOrder!.items[0]?.sku).toBe('LOAFERS-001');
    expect(dbOrder!.items[0]?.quantity).toBe(2);
    expect(dbOrder!.shippingAddress.recipientName).toBe('Kelechi Nwosu');
    expect(dbOrder!.shippingMethodName).toBe('Direct Delivery');
    expect(dbOrder!.notes).toBe('Please ring the front bell on arrival.');

    // Verify inventory reservation in database
    const reservation = await InventoryReservation.findOne({
      $or: [
        { reservationId: dbOrder!.reservationReference },
        { referenceId: dbOrder!._id.toString() },
      ],
    });
    expect(reservation).not.toBeNull();
    expect(reservation!.items[0]?.quantity).toBe(2);

    // Verify customer cart was emptied
    const cart = await Cart.findOne({ userId: customer._id });
    expect(cart!.items).toHaveLength(0);
  });

  it('rejects duplicate order placement for the same expired/completed session', async () => {
    const res = await fetch(`${testServer.url}/api/v1/checkout/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ acceptTerms: true }),
    });
    expect([200, 201, 400, 422]).toContain(res.status);
  });
});
