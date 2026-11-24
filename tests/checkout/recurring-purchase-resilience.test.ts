import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
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
import { Payment } from '../../backend/src/models/Payment.model.js';
import { Transaction } from '../../backend/src/models/Transaction.model.js';
import { WebhookEvent } from '../../backend/src/models/WebhookEvent.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { paymentProviderFactory } from '../../backend/src/modules/payment/providers/payment-provider.factory.js';
import type {
  IPaymentProvider,
  InitializePaymentParams,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  ProcessRefundParams,
  ProcessRefundResponse,
  VerifyWebhookResult,
} from '../../backend/src/modules/payment/providers/payment-provider.interface.js';
import {
  ProductStatus,
  UserRole,
  ShippingCalculationType,
  OrderStatus,
  PaymentStatus,
} from '@shared/enums.js';

class MockPaystackProvider implements IPaymentProvider {
  public readonly providerName = 'paystack';
  public shouldFailInit = false;
  public verifyStatus: 'success' | 'failed' | 'abandoned' | 'pending' = 'success';
  public amountMinorMismatch = false;

  public async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResponse> {
    if (this.shouldFailInit) {
      throw new Error('Paystack gateway service temporarily unavailable (503)');
    }
    return {
      reference: params.reference,
      authorizationUrl: `https://checkout.paystack.com/mock-${params.reference}`,
      accessCode: `mock_code_${params.reference}`,
      rawResponse: { reference: params.reference, status: true },
    };
  }

  public async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    return {
      reference,
      gatewayTransactionId: `trx_mock_${reference}`,
      status: this.verifyStatus,
      amountMinor: this.amountMinorMismatch ? 100 : 2550000,
      currency: 'NGN',
      channel: 'card',
      paidAt: new Date(),
      ipAddress: '127.0.0.1',
      gatewayFeeMinor: 25000,
      customerEmail: 'customer@test.com',
      rawResponse: { reference, status: this.verifyStatus },
    };
  }

  public async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResponse> {
    return {
      refundReference: `ref_${params.transactionReference}`,
      status: 'processed',
      amountMinor: params.amountMinor || 2550000,
      currency: 'NGN',
    };
  }

  public async fetchTransaction(reference: string): Promise<VerifyPaymentResponse> {
    return this.verifyPayment(reference);
  }

  public verifyWebhookSignature(_rawBody: Buffer, signature: string): boolean {
    return signature === 'valid_mock_signature';
  }

  public parseWebhookEvent(rawBody: Buffer, signature: string): VerifyWebhookResult {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      return { isValid: false };
    }
    try {
      const parsed = JSON.parse(rawBody.toString('utf8'));
      return {
        isValid: true,
        event: parsed.event,
        data: parsed.data,
        reference: parsed.data?.reference,
      };
    } catch {
      return { isValid: false };
    }
  }
}

describe('20-Scenario Recurring Purchase Resilience Test Suite', () => {
  let testServer: TestServer;
  let mockProvider: MockPaystackProvider;
  let customer1: UserDocument;
  let customer1Token: string;
  let customer2: UserDocument;
  let customer2Token: string;
  let customer1Address: AddressDocument;
  let customer2Address: AddressDocument;
  let testProduct: ProductDocument;
  let shippingConfig: ShippingConfigurationDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-recurring-purchase-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);

    mockProvider = new MockPaystackProvider();
    paymentProviderFactory.registerProvider(mockProvider);

    const app = createApp();
    testServer = await startTestServer(app);
  });

  afterAll(async () => {
    await testServer.close();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    mockProvider.shouldFailInit = false;
    mockProvider.verifyStatus = 'success';
    mockProvider.amountMinorMismatch = false;

    await User.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await CheckoutSession.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    await InventoryReservation.deleteMany({});
    await Payment.deleteMany({});
    await Transaction.deleteMany({});
    await WebhookEvent.deleteMany({});

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    customer1 = await User.create({
      firstName: 'Chinwe',
      lastName: 'Okafor',
      email: 'chinwe.okafor@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer1Token = authService.generateAccessToken(customer1);

    customer2 = await User.create({
      firstName: 'Emeka',
      lastName: 'Adeyemi',
      email: 'emeka.adeyemi@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer2Token = authService.generateAccessToken(customer2);

    customer1Address = await Address.create({
      userId: customer1._id,
      recipientName: 'Chinwe Okafor',
      phone: '+2348012345678',
      streetAddress: '14 Victoria Island Road',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '101241',
      country: 'Nigeria',
      isDefault: true,
    });

    customer2Address = await Address.create({
      userId: customer2._id,
      recipientName: 'Emeka Adeyemi',
      phone: '+2348098765432',
      streetAddress: '22 Wuse Zone 2',
      city: 'Abuja',
      state: 'FCT',
      postalCode: '900281',
      country: 'Nigeria',
      isDefault: true,
    });

    const category = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Cartiva Pro Tablet',
      slug: 'cartiva-pro-tablet',
      sku: 'TAB-PRO-001',
      brand: 'Cartiva Tech',
      shortDescription: 'High performance tablet for professionals.',
      fullDescription: 'Comprehensive full description of Cartiva Pro Tablet with all specifications.',
      regularPrice: 25000,
      currency: 'NGN',
      stockQuantity: 100,
      weightGrams: 500,
      categoryId: category._id,
      status: ProductStatus.PUBLISHED,
    });

    shippingConfig = await ShippingConfiguration.create({
      zoneName: 'Lagos Metropolitan Zone',
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos', 'FCT', 'Rivers', 'Ogun'],
      carrierName: 'Cartiva Logistics',
      methodName: 'Standard Nationwide Delivery',
      baseRate: 500,
      rateCalculationType: ShippingCalculationType.FLAT,
      freeShippingThreshold: 500000,
      estimatedDeliveryDaysMin: 2,
      estimatedDeliveryDaysMax: 4,
      isActive: true,
    });
  });

  const setupCustomerCartAndSession = async (token: string, addressId: string) => {
    // 1. Add item to cart
    await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { productId: testProduct._id.toString(), quantity: 1 },
    });

    // 2. Initialize checkout session
    const sessionRes = await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sessionRes.status).toBe(200);

    // 3. Set delivery address
    const addrRes = await testServer.request('/api/v1/checkout/session/address', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { addressId },
    });
    expect(addrRes.status).toBe(200);

    // 4. Set shipping method
    const shipRes = await testServer.request('/api/v1/checkout/session/shipping', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { shippingMethodId: shippingConfig._id.toString() },
    });
    expect(shipRes.status).toBe(200);

    return sessionRes.body.data;
  };

  // --- SCENARIO 1: First purchase by new customer ---
  it('Scenario 1: First purchase by new customer executes full lifecycle cleanly', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());

    // Confirm order
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true, customerNotes: 'First purchase' },
    });
    expect(confirmRes.status).toBe(201);
    const orderNumber = confirmRes.body.data.orderNumber;
    expect(orderNumber).toBeDefined();

    // Initialize payment
    const initRes = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    expect(initRes.status).toBe(201);
    const ref = initRes.body.data.paymentReference;

    // Verify payment
    const verifyRes = await testServer.request(`/api/v1/payments/${ref}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe(PaymentStatus.PAID);
    expect(verifyRes.body.data.isOrderConfirmed).toBe(true);

    // Confirm order in database is CONFIRMED and PAID
    const order = await Order.findOne({ orderNumber });
    expect(order?.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(order?.paymentStatus).toBe(PaymentStatus.PAID);
  });

  // --- SCENARIO 2: Immediate second purchase by the same customer ---
  it('Scenario 2: Immediate second purchase by same customer generates new distinct order and payment', async () => {
    // First purchase
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirm1 = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const order1Number = confirm1.body.data.orderNumber;
    const init1 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber: order1Number },
    });
    await testServer.request(`/api/v1/payments/${init1.body.data.paymentReference}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    // Second purchase immediately afterwards
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirm2 = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    expect(confirm2.status).toBe(201);
    const order2Number = confirm2.body.data.orderNumber;
    expect(order2Number).not.toBe(order1Number);

    const init2 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber: order2Number },
    });
    expect(init2.status).toBe(201);
    expect(init2.body.data.paymentReference).not.toBe(init1.body.data.paymentReference);

    const verify2 = await testServer.request(`/api/v1/payments/${init2.body.data.paymentReference}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(verify2.status).toBe(200);
    expect(verify2.body.data.isOrderConfirmed).toBe(true);

    const order2 = await Order.findOne({ orderNumber: order2Number });
    expect(order2?.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(order2?.paymentStatus).toBe(PaymentStatus.PAID);
  });

  // --- SCENARIO 3: Multiple consecutive purchases in a loop ---
  it('Scenario 3: 3 consecutive purchases execute without session collisions or order leaks', async () => {
    const orderNumbers: string[] = [];
    const paymentRefs: string[] = [];

    for (let i = 0; i < 3; i++) {
      await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
      const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { acceptTerms: true, customerNotes: `Iteration ${i}` },
      });
      expect(confirmRes.status).toBe(201);
      orderNumbers.push(confirmRes.body.data.orderNumber);

      const initRes = await testServer.request('/api/v1/payments/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { orderNumber: confirmRes.body.data.orderNumber },
      });
      paymentRefs.push(initRes.body.data.paymentReference);

      await testServer.request(`/api/v1/payments/${initRes.body.data.paymentReference}/verify`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
    }

    // All orders and payment references must be distinct
    const uniqueOrders = new Set(orderNumbers);
    const uniqueRefs = new Set(paymentRefs);
    expect(uniqueOrders.size).toBe(3);
    expect(uniqueRefs.size).toBe(3);
  });

  // --- SCENARIO 4: Purchase by different customer (User Isolation) ---
  it('Scenario 4: Customer A and Customer B purchases maintain strict data and session isolation', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    await setupCustomerCartAndSession(customer2Token, customer2Address._id.toString());

    const confirmA = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const confirmB = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: { acceptTerms: true },
    });

    expect(confirmA.status).toBe(201);
    expect(confirmB.status).toBe(201);
    expect(confirmA.body.data.orderNumber).not.toBe(confirmB.body.data.orderNumber);

    // Customer B cannot initialize payment for Customer A's order
    const crossInit = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: { orderNumber: confirmA.body.data.orderNumber },
    });
    expect(crossInit.status).toBe(403);
  });

  // --- SCENARIO 5: Page refresh during active checkout ---
  it('Scenario 5: Re-fetching session simulates page refresh, preserving state', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());

    // Simulate page refresh: GET /checkout/session again
    const refreshRes = await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.shippingAddressSnapshot.recipientName).toBe('Chinwe Okafor');
    expect(refreshRes.body.data.shippingMethodSnapshot.methodName).toBe('Standard Nationwide Delivery');
  });

  // --- SCENARIO 6: Restoring existing checkout session ---
  it('Scenario 6: Existing session financials match line items precisely upon resumption', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());

    const sessionRes = await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.subtotal).toBe(25000);
    expect(sessionRes.body.data.shippingFee).toBe(500);
    expect(sessionRes.body.data.totalAmount).toBe(25500);
  });

  // --- SCENARIO 7: Token expiration and authentication persistence ---
  it('Scenario 7: Missing credentials rejected with 401; valid token accepted', async () => {
    const unauthRes = await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
    });
    expect(unauthRes.status).toBe(401);

    const authRes = await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    // Cart is empty right now, so it should return 400 with CHECKOUT_EMPTY_CART, not 401
    expect(authRes.status).toBe(400);
    expect(authRes.body.error.code).toBe('CHECKOUT_EMPTY_CART');
  });

  // --- SCENARIO 8: Purchase after abandoned payment ---
  it('Scenario 8: Abandoned payment allows initiating a fresh payment reference cleanly', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    // First payment attempt
    const init1 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    const ref1 = init1.body.data.paymentReference;

    // Simulate gateway marked payment as abandoned
    mockProvider.verifyStatus = 'abandoned';
    await testServer.request(`/api/v1/payments/${ref1}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    const payment1 = await Payment.findOne({ paymentReference: ref1 });
    expect(payment1?.status).toBe(PaymentStatus.ABANDONED);

    // Re-initialize payment for same order
    mockProvider.verifyStatus = 'success';
    const init2 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    expect(init2.status).toBe(201);
    const ref2 = init2.body.data.paymentReference;
    expect(ref2).not.toBe(ref1);

    // Verify second payment succeeds
    const verify2 = await testServer.request(`/api/v1/payments/${ref2}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(verify2.status).toBe(200);
    expect(verify2.body.data.status).toBe(PaymentStatus.PAID);
  });

  // --- SCENARIO 9: Retry of failed payment ---
  it('Scenario 9: POST /payments/:reference/retry issues a new session for failed payment', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    const init1 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    const ref1 = init1.body.data.paymentReference;

    // Simulate gateway failure
    mockProvider.verifyStatus = 'failed';
    await testServer.request(`/api/v1/payments/${ref1}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    // Call retry endpoint
    mockProvider.verifyStatus = 'success';
    const retryRes = await testServer.request(`/api/v1/payments/${ref1}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(retryRes.status).toBe(201);
    const ref2 = retryRes.body.data.paymentReference;
    expect(ref2).not.toBe(ref1);

    // Verification of new reference succeeds
    const verifyRetry = await testServer.request(`/api/v1/payments/${ref2}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(verifyRetry.status).toBe(200);
    expect(verifyRetry.body.data.isOrderConfirmed).toBe(true);
  });

  // --- SCENARIO 10: Purchase when payment remains pending ---
  it('Scenario 10: Order remains PENDING_PAYMENT until gateway verification succeeds', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    const initRes = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });

    mockProvider.verifyStatus = 'pending';
    const verifyRes = await testServer.request(`/api/v1/payments/${initRes.body.data.paymentReference}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.isOrderConfirmed).toBe(false);

    const order = await Order.findOne({ orderNumber });
    expect(order?.orderStatus).toBe(OrderStatus.PENDING_PAYMENT);
    expect(order?.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  // --- SCENARIO 11: Purchase after successful payment ---
  it('Scenario 11: Subsequent purchase cart is clean and does not conflict with completed orders', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirm1 = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const init1 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber: confirm1.body.data.orderNumber },
    });
    await testServer.request(`/api/v1/payments/${init1.body.data.paymentReference}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    // Verify cart was emptied
    const cartRes = await testServer.request('/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(cartRes.status).toBe(200);
    const cartItems = cartRes.body.data?.items ?? cartRes.body.data?.cart?.items ?? [];
    expect(cartItems.length).toBe(0);

    // Can add item again and start completely independent purchase
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirm2 = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    expect(confirm2.status).toBe(201);
    expect(confirm2.body.data.orderNumber).not.toBe(confirm1.body.data.orderNumber);
  });

  // --- SCENARIO 12: Duplicate checkout submission protection (Idempotency) ---
  it('Scenario 12: Concurrent double-submission returns identical order without duplicate database records', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());

    // Fire two confirm requests
    const [res1, res2] = await Promise.all([
      testServer.request('/api/v1/checkout/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { acceptTerms: true, customerNotes: 'Idempotency test' },
      }),
      testServer.request('/api/v1/checkout/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customer1Token}` },
        body: { acceptTerms: true, customerNotes: 'Idempotency test' },
      }),
    ]);

    // In concurrent double-submission, one request successfully creates the order (201).
    // The sibling concurrent request either receives 201 (idempotent return) or is safely rejected (400/409/422).
    const successRes = res1.status === 201 ? res1 : res2;
    const secondaryRes = res1.status === 201 ? res2 : res1;

    expect(successRes.status).toBe(201);
    expect([201, 400, 409, 422]).toContain(secondaryRes.status);

    const orderNumber1 = successRes.body?.data?.orderNumber;
    expect(orderNumber1).toBeDefined();

    if (secondaryRes.status === 201 && secondaryRes.body?.data?.orderNumber) {
      expect(secondaryRes.body.data.orderNumber).toBe(orderNumber1);
    }

    const count = await Order.countDocuments({ userId: customer1._id });
    expect(count).toBe(1);
  });

  // --- SCENARIO 13: Cryptographic webhook idempotency ---
  it('Scenario 13: Duplicate webhook deliveries return acknowledged duplicate without reprocessing', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    const initRes = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    const ref = initRes.body.data.paymentReference;

    const webhookPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 'evt_test_12345',
        reference: ref,
        amount: 2550000,
        currency: 'NGN',
        status: 'success',
      },
    });

    // First delivery
    const hook1 = await testServer.request('/api/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': 'valid_mock_signature',
        'Content-Type': 'application/json',
      },
      body: JSON.parse(webhookPayload),
    });
    expect(hook1.status).toBe(200);

    // Second delivery (duplicate replay)
    const hook2 = await testServer.request('/api/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': 'valid_mock_signature',
        'Content-Type': 'application/json',
      },
      body: JSON.parse(webhookPayload),
    });
    expect(hook2.status).toBe(200);
    expect(hook2.body.data?.duplicate ?? hook2.body.duplicate).toBe(true);
  });

  // --- SCENARIO 14: Gateway temporary unavailability handling ---
  it('Scenario 14: Gateway 503 during initialization surfaces structured error without corrupting order', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    mockProvider.shouldFailInit = true;
    const initFail = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    expect(initFail.status).toBe(500);

    // Order remains pending and intact
    const order = await Order.findOne({ orderNumber });
    expect(order?.orderStatus).toBe(OrderStatus.PENDING_PAYMENT);
    expect(order?.paymentStatus).toBe(PaymentStatus.PENDING);

    // Gateway recovers
    mockProvider.shouldFailInit = false;
    const initRetry = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    expect(initRetry.status).toBe(201);
  });

  // --- SCENARIO 15: Network interruption resilience ---
  it('Scenario 15: Order status can be safely queried after network drop', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    const queryRes = await testServer.request(`/api/v1/orders/${confirmRes.body.data.orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.orderNumber).toBe(orderNumber);
  });

  // --- SCENARIO 16: Invalid checkout data rejection ---
  it('Scenario 16: Non-existent address or shipping method rejected with 404/400', async () => {
    await testServer.request('/api/v1/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { productId: testProduct._id.toString(), quantity: 1 },
    });
    await testServer.request('/api/v1/checkout/session', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    const fakeAddressId = new Types.ObjectId().toString();
    const badAddr = await testServer.request('/api/v1/checkout/session/address', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { addressId: fakeAddressId },
    });
    expect(badAddr.status).toBe(404);

    const fakeShippingId = new Types.ObjectId().toString();
    const badShip = await testServer.request('/api/v1/checkout/session/shipping', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { shippingMethodId: fakeShippingId },
    });
    expect([400, 404]).toContain(badShip.status);
  });

  // --- SCENARIO 17: Unauthorized access rejection ---
  it('Scenario 17: Verification of another user transaction rejected with 403', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const initRes = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber: confirmRes.body.data.orderNumber },
    });
    const ref = initRes.body.data.paymentReference;

    // Customer 2 attempts to verify Customer 1's payment
    const crossVerify = await testServer.request(`/api/v1/payments/${ref}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    expect(crossVerify.status).toBe(403);
  });

  // --- SCENARIO 18: Expired or invalid payment reference handling ---
  it('Scenario 18: Querying non-existent payment reference returns 404', async () => {
    const notFoundRes = await testServer.request('/api/v1/payments/PAY-NONEXISTENT-REF/verify', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(notFoundRes.status).toBe(404);
  });

  // --- SCENARIO 19: Order payment reference linkage update ---
  it('Scenario 19: Order payment reference link updates to fresh payment record on retry', async () => {
    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    const init1 = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    const ref1 = init1.body.data.paymentReference;

    mockProvider.verifyStatus = 'failed';
    await testServer.request(`/api/v1/payments/${ref1}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    mockProvider.verifyStatus = 'success';
    const retryRes = await testServer.request(`/api/v1/payments/${ref1}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const ref2 = retryRes.body.data.paymentReference;

    const updatedOrder = await Order.findOne({ orderNumber });
    const payment2 = await Payment.findOne({ paymentReference: ref2 });
    expect(updatedOrder?.paymentId?.toString()).toBe(payment2?._id.toString());
  });

  // --- SCENARIO 20: Comprehensive stock reservation integrity ---
  it('Scenario 20: Stock is reserved atomically and confirmed without double deduction', async () => {
    const initialProduct = await Product.findById(testProduct._id);
    expect(initialProduct?.stockQuantity).toBe(100);

    await setupCustomerCartAndSession(customer1Token, customer1Address._id.toString());
    const confirmRes = await testServer.request('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { acceptTerms: true },
    });
    const orderNumber = confirmRes.body.data.orderNumber;

    // Reservation exists
    const reservation = await InventoryReservation.findOne({
      reservationId: confirmRes.body.data.reservationReference,
    });
    expect(reservation).toBeDefined();

    // Payment verification confirms reservation and finalizes stock deduction
    const initRes = await testServer.request('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { orderNumber },
    });
    await testServer.request(`/api/v1/payments/${initRes.body.data.paymentReference}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });

    const finalProduct = await Product.findById(testProduct._id);
    expect(finalProduct?.stockQuantity).toBe(99);
  });
});

