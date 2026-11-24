import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Category } from '../../backend/src/models/Category.model.js';
import { Order, type OrderDocument } from '../../backend/src/models/Order.model.js';
import { InventoryReservation } from '../../backend/src/models/InventoryReservation.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { inventoryService } from '../../backend/src/modules/inventory/inventory.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus, UserRole, OrderStatus, PaymentStatus } from '@shared/enums.js';

describe('Customer Order History, Detail & Self-Service Cancellation (/api/v1/orders)', () => {
  let testServer: TestServer;
  let customer1: UserDocument;
  let customer2: UserDocument;
  let customer1Token: string;
  let customer2Token: string;
  let testProduct: ProductDocument;
  let order1: OrderDocument;
  let order2Delivered: OrderDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-order-cancel-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await InventoryReservation.deleteMany({});
    await AuditLog.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    customer1 = await User.create({
      firstName: 'Bisi',
      lastName: 'Akintola',
      email: 'bisi.cancel@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer1Token = authService.generateAccessToken(customer1);

    customer2 = await User.create({
      firstName: 'Chidi',
      lastName: 'Obi',
      email: 'chidi.cancel@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customer2Token = authService.generateAccessToken(customer2);

    const category = await Category.create({
      name: 'Appliances',
      slug: 'appliances-cancel',
      isActive: true,
    });

    testProduct = await Product.create({
      title: 'Espresso Coffee Machine',
      slug: 'espresso-coffee-machine-cancel',
      sku: 'ESPRESSO-001',
      brand: 'Cartiva Kitchen',
      shortDescription: '15-bar Italian pump espresso maker.',
      fullDescription: 'Long description.',
      regularPrice: 120000,
      currency: 'NGN',
      categoryId: category._id,
      stockQuantity: 15,
      weightGrams: 4200,
      status: ProductStatus.PUBLISHED,
    });

    // Create Order 1 for Customer 1 (PENDING_PAYMENT with active reservation)
    order1 = await Order.create({
      orderNumber: 'ORD-20261103-BIS001',
      userId: customer1._id,
      customerEmail: customer1.email,
      customerPhone: '+2348022334455',
      items: [
        {
          productId: testProduct._id,
          sku: testProduct.sku,
          title: testProduct.title,
          unitPrice: 120000,
          unitPriceMinor: 12000000,
          quantity: 1,
          subtotal: 120000,
          subtotalMinor: 12000000,
        },
      ],
      shippingAddress: {
        recipientName: 'Bisi Akintola',
        phone: '+2348022334455',
        streetAddress: '10 Bode Thomas',
        city: 'Surulere',
        state: 'Lagos',
        country: 'Nigeria',
      },
      shippingMethodName: 'Standard Courier',
      subtotal: 120000,
      subtotalMinor: 12000000,
      shippingFee: 2000,
      shippingFeeMinor: 200000,
      totalAmount: 122000,
      totalAmountMinor: 12200000,
      currency: 'NGN',
      orderStatus: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
    });

    // Create stock reservation for Order 1
    const reservationResult = await inventoryService.createReservation({
      referenceId: order1._id.toString(),
      referenceType: 'order',
      expiresInMinutes: 30,
      items: [{ productId: testProduct._id.toString(), sku: testProduct.sku, quantity: 1 }],
    });

    order1.reservationReference = reservationResult.reservationId;
    await order1.save();

    // Create Order 2 for Customer 1 (DELIVERED - not cancellable)
    order2Delivered = await Order.create({
      orderNumber: 'ORD-20261103-BIS002',
      userId: customer1._id,
      customerEmail: customer1.email,
      customerPhone: '+2348022334455',
      items: [
        {
          productId: testProduct._id,
          sku: testProduct.sku,
          title: testProduct.title,
          unitPrice: 120000,
          unitPriceMinor: 12000000,
          quantity: 1,
          subtotal: 120000,
          subtotalMinor: 12000000,
        },
      ],
      shippingAddress: {
        recipientName: 'Bisi Akintola',
        phone: '+2348022334455',
        streetAddress: '10 Bode Thomas',
        city: 'Surulere',
        state: 'Lagos',
        country: 'Nigeria',
      },
      shippingMethodName: 'Standard Courier',
      subtotal: 120000,
      subtotalMinor: 12000000,
      shippingFee: 2000,
      shippingFeeMinor: 200000,
      totalAmount: 122000,
      totalAmountMinor: 12200000,
      currency: 'NGN',
      orderStatus: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });
  });

  afterAll(async () => {
    await testServer.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('lists customer order history with pagination', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('retrieves detailed customer order by orderNumber', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders/${order1.orderNumber}`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toBe(order1.orderNumber);
    expect(body.data.orderStatus).toBe(OrderStatus.PENDING_PAYMENT);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].sku).toBe('ESPRESSO-001');
  });

  it('prevents IDOR: Customer 2 cannot access Customer 1 order detail', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders/${order1.orderNumber}`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('prevents IDOR: Customer 2 cannot cancel Customer 1 order', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders/${order1.orderNumber}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({ reason: 'Malicious attempt' }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects cancellation of orders in ineligible states (DELIVERED)', async () => {
    const res = await fetch(
      `${testServer.url}/api/v1/orders/${order2Delivered.orderNumber}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`,
        },
        body: JSON.stringify({ reason: 'I want to cancel delivered item' }),
      }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ORDER_CANNOT_BE_CANCELLED');
  });

  it('successfully cancels eligible order, releases inventory reservation, and records audit trail', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders/${order1.orderNumber}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Customer changed their mind' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderStatus).toBe(OrderStatus.CANCELLED);
    expect(body.data.cancellationReason).toBe('Customer changed their mind');

    // Verify database record
    const updatedOrder = await Order.findById(order1._id);
    expect(updatedOrder!.orderStatus).toBe(OrderStatus.CANCELLED);
    expect(updatedOrder!.cancelledAt).toBeDefined();

    // Verify inventory reservation was released
    const reservation = await InventoryReservation.findOne({
      referenceId: order1._id.toString(),
    });
    expect(reservation).not.toBeNull();
    expect(reservation!.status).toBe('released');

    // Verify audit log entry
    const auditLogs = await AuditLog.find({
      $or: [
        { entity: 'Order', entityId: order1._id.toString() },
        { resource: 'Order', resourceId: order1._id },
      ],
      action: 'ORDER_CANCELLED',
    });
    expect(auditLogs).toHaveLength(1);
  });

  it('rejects duplicate cancellation of already cancelled order', async () => {
    const res = await fetch(`${testServer.url}/api/v1/orders/${order1.orderNumber}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Repeat cancellation' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ORDER_ALREADY_CANCELLED');
  });
});
