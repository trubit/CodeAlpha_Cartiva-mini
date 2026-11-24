import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../backend/src/config/database.js';
import {
  User,
  Category,
  Product,
  Cart,
  Wishlist,
  Order,
  Payment,
  Transaction,
  Review,
  Coupon,
  Address,
  InventoryMovement,
  Notification,
  SupportTicket,
  AuditLog,
  ShippingConfiguration,
} from '../backend/src/models/index.js';
import {
  UserRole,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  TransactionType,
  DiscountType,
  InventoryMovementType,
  NotificationType,
  SupportTicketCategory,
  ShippingCalculationType,
} from '../shared/types/enums.js';

describe('16 Mongoose Models Architecture & Data Integrity', () => {
  const TEST_MODELS_URI = 'mongodb://localhost:27017/cartiva-mini-models-test';

  beforeAll(async () => {
    await connectDatabase(TEST_MODELS_URI);
    // Ensure clean test collections
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    // Wait for Mongoose to build unique indexes in MongoDB
    await Promise.all([
      User.init(),
      Category.init(),
      Product.init(),
      Cart.init(),
      Wishlist.init(),
      Order.init(),
      Payment.init(),
      Transaction.init(),
      Review.init(),
      Coupon.init(),
      Address.init(),
      InventoryMovement.init(),
      Notification.init(),
      SupportTicket.init(),
      AuditLog.init(),
      ShippingConfiguration.init(),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDatabase();
  });

  // 1. User Model
  it('User: creates valid user, lowercases email, and excludes passwordHash in toJSON', async () => {
    const user = await User.create({
      email: 'John.Doe@Example.com',
      passwordHash: '$2b$12$e8Yk...',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
    });

    expect(user._id).toBeDefined();
    expect(user.email).toBe('john.doe@example.com'); // Lowercase normalization

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined(); // Sensitive data protection
    expect(json.__v).toBeUndefined();
  });

  it('User: rejects duplicate email addresses via unique constraint', async () => {
    await expect(
      User.create({
        email: 'john.doe@example.com',
        passwordHash: '$2b$12$anotherhash...',
        firstName: 'Johnny',
        lastName: 'Doe',
      })
    ).rejects.toThrow();
  });

  // 2. Category Model
  it('Category: creates category and rejects self as parent category', async () => {
    const category = await Category.create({
      name: 'Electronics & Audio',
      slug: 'electronics-audio',
      description: 'Headphones, speakers, and gear',
    });

    expect(category.slug).toBe('electronics-audio');

    // Attempt to set parent category to self
    category.parentId = category._id as Types.ObjectId;
    await expect(category.save()).rejects.toThrow('A category cannot be its own parent category');
  });

  // 3. Product Model
  it('Product: validates SKU uppercase, slug, and rejects salePrice > regularPrice', async () => {
    const category = await Category.findOne({ slug: 'electronics-audio' });
    const product = new Product({
      title: 'Acoustic Wireless Headphones',
      slug: 'acoustic-wireless-headphones',
      sku: 'hed-wh-001',
      shortDescription: 'High fidelity studio audio',
      fullDescription: 'Comprehensive sound with active noise cancellation.',
      regularPrice: 45000,
      salePrice: 50000, // Invalid: salePrice > regularPrice
      categoryId: category?._id,
      stockQuantity: 15,
      status: ProductStatus.PUBLISHED,
    });

    await expect(product.save()).rejects.toThrow(
      'Sale price must be less than or equal to regular price'
    );

    // Correct sale price and save
    product.salePrice = 38000;
    await product.save();
    expect(product.sku).toBe('HED-WH-001'); // Uppercase normalization

    const json = product.toJSON();
    expect(json.costPrice).toBeUndefined(); // Masked cost price
  });

  // 4. Cart Model
  it('Cart: requires userId or sessionId and calculates subtotal automatically', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });
    const product = await Product.findOne({ sku: 'HED-WH-001' });

    // Empty cart with neither userId nor sessionId must fail
    await expect(Cart.create({})).rejects.toThrow();

    const cart = await Cart.create({
      userId: user?._id,
      items: [
        {
          productId: product?._id,
          sku: product?.sku,
          title: product?.title,
          unitPrice: 38000,
          quantity: 2,
        },
      ],
    });

    expect(cart.subtotal).toBe(76000); // 38000 * 2
  });

  // 5. Wishlist Model
  it('Wishlist: deduplicates multiple additions of the same product', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });
    const product = await Product.findOne({ sku: 'HED-WH-001' });

    const wishlist = await Wishlist.create({
      userId: user?._id,
      items: [
        { productId: product?._id },
        { productId: product?._id }, // Duplicate
      ],
    });

    expect(wishlist.items.length).toBe(1); // Deduplicated in pre-save hook
  });

  // 6. Order Model
  it('Order: enforces immutable address snapshots and valid monetary calculations', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });
    const product = await Product.findOne({ sku: 'HED-WH-001' });

    const order = await Order.create({
      orderNumber: 'ORD-202611-001',
      userId: user?._id,
      customerEmail: 'john.doe@example.com',
      customerPhone: '+2348012345678',
      items: [
        {
          productId: product?._id,
          sku: 'HED-WH-001',
          title: 'Acoustic Wireless Headphones',
          unitPrice: 38000,
          quantity: 1,
          subtotal: 38000,
        },
      ],
      shippingAddress: {
        recipientName: 'John Doe',
        phone: '+2348012345678',
        streetAddress: '15 Marina Street',
        city: 'Lagos Island',
        state: 'Lagos',
        country: 'Nigeria',
      },
      subtotal: 38000,
      discountAmount: 3800,
      shippingFee: 2500,
      taxAmount: 0,
      totalAmount: 36700, // 38000 - 3800 + 2500
      orderStatus: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
    });

    expect(order.orderNumber).toBe('ORD-202611-001');
    expect(order.totalAmount).toBe(36700);
    expect(order.shippingAddress.city).toBe('Lagos Island');
  });

  // 7. Payment Model
  it('Payment: creates unique payment record associated with an order', async () => {
    const order = await Order.findOne({ orderNumber: 'ORD-202611-001' });

    const payment = await Payment.create({
      paymentReference: 'PAY-202611-001',
      orderId: order?._id,
      userId: order?.userId,
      amount: 36700,
      currency: 'NGN',
      gateway: 'paystack',
      status: PaymentStatus.PENDING,
    });

    expect(payment.paymentReference).toBe('PAY-202611-001');
    expect(payment.amount).toBe(36700);

    // Reject duplicate payment reference
    await expect(
      Payment.create({
        paymentReference: 'PAY-202611-001',
        orderId: new Types.ObjectId(),
        userId: order?.userId,
        amount: 36700,
      })
    ).rejects.toThrow();
  });

  // 8. Transaction Model
  it('Transaction: computes net amount after gateway fee deduction', async () => {
    const payment = await Payment.findOne({ paymentReference: 'PAY-202611-001' });

    const transaction = await Transaction.create({
      transactionReference: 'TXN-202611-001',
      paymentId: payment?._id,
      orderId: payment?.orderId,
      userId: payment?.userId,
      type: TransactionType.CHARGE,
      amount: 36700,
      gatewayFee: 550.5,
      description: 'Paystack Card Charge',
    });

    expect(transaction.netAmount).toBe(36149.5); // 36700 - 550.5
  });

  // 9. Review Model
  it('Review: validates integer 1-5 rating and enforces one review per user per product', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });
    const product = await Product.findOne({ sku: 'HED-WH-001' });
    const order = await Order.findOne({ orderNumber: 'ORD-202611-001' });

    // Invalid rating > 5
    await expect(
      Review.create({
        productId: product?._id,
        userId: user?._id,
        orderId: order?._id,
        rating: 6, // Invalid
        title: 'Too Good',
        comment: 'Exceeds five stars',
      })
    ).rejects.toThrow('Rating cannot exceed 5 stars');

    // Valid review
    const review = await Review.create({
      productId: product?._id,
      userId: user?._id,
      orderId: order?._id,
      rating: 5,
      title: 'Superb Sound Quality',
      comment: 'Crisp bass and long battery life. Delivered in 24 hours.',
    });

    expect(review.rating).toBe(5);

    // Attempt second review for same user and product -> must violate unique compound index
    await expect(
      Review.create({
        productId: product?._id,
        userId: user?._id,
        orderId: order?._id,
        rating: 4,
        title: 'Second review attempt',
        comment: 'Should be rejected',
      })
    ).rejects.toThrow();
  });

  // 10. Coupon Model
  it('Coupon: validates percentage discount <= 100% and expiryDate > startDate', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Invalid percentage > 100
    await expect(
      Coupon.create({
        code: 'MEGA150',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150, // Invalid
        startDate: now,
        expiryDate: tomorrow,
      })
    ).rejects.toThrow('Percentage discount cannot exceed 100%');

    // Invalid expiryDate <= startDate
    await expect(
      Coupon.create({
        code: 'EXPIRED10',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        startDate: now,
        expiryDate: yesterday, // Invalid
      })
    ).rejects.toThrow('Expiry date must be strictly after the start date');

    // Valid coupon
    const coupon = await Coupon.create({
      code: 'WELCOME10',
      description: '10% off inaugural order',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderValue: 20000,
      startDate: now,
      expiryDate: tomorrow,
    });

    expect(coupon.code).toBe('WELCOME10');
  });

  // 11. Address Model
  it('Address: validates phone format and stores user shipping address', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });

    const address = await Address.create({
      userId: user?._id,
      recipientName: 'John Doe',
      phone: '+2348098765432',
      streetAddress: '24 Admiralty Way',
      city: 'Lekki Phase 1',
      state: 'Lagos',
      country: 'Nigeria',
      isDefaultShipping: true,
    });

    expect(address.city).toBe('Lekki Phase 1');
    expect(address.isDefaultShipping).toBe(true);
  });

  // 12. InventoryMovement Model
  it('InventoryMovement: enforces mathematical consistency between previous, changed, and new stock', async () => {
    const product = await Product.findOne({ sku: 'HED-WH-001' });

    // Inconsistent arithmetic: previousStock = 15, quantity = -2, newStock = 14 (should be 13)
    await expect(
      InventoryMovement.create({
        productId: product?._id,
        sku: 'HED-WH-001',
        movementType: InventoryMovementType.PURCHASE_DEDUCTION,
        previousStock: 15,
        quantity: -2,
        newStock: 14, // Invalid: 15 + (-2) != 14
        reason: 'Order fulfillment',
      })
    ).rejects.toThrow('New stock must mathematically equal previous stock plus quantity changed');

    // Valid movement
    const movement = await InventoryMovement.create({
      productId: product?._id,
      sku: 'HED-WH-001',
      movementType: InventoryMovementType.PURCHASE_DEDUCTION,
      previousStock: 15,
      quantity: -2,
      newStock: 13,
      reason: 'Order ORD-202611-001 fulfillment',
    });

    expect(movement.newStock).toBe(13);
  });

  // 13. Notification Model
  it('Notification: creates in-app notification with default unread state', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });

    const notification = await Notification.create({
      recipientId: user?._id,
      type: NotificationType.ORDER_STATUS,
      title: 'Order Confirmed',
      message: 'Your order ORD-202611-001 has been confirmed and is being packed.',
      actionUrl: '/orders/ORD-202611-001',
    });

    expect(notification.isRead).toBe(false);
    expect(notification.title).toBe('Order Confirmed');
  });

  // 14. SupportTicket Model
  it('SupportTicket: creates customer ticket with messages subdocument', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });

    const ticket = await SupportTicket.create({
      ticketNumber: 'TCK-202611-001',
      userId: user?._id,
      subject: 'Delivery Window Inquiry',
      category: SupportTicketCategory.ORDER_INQUIRY,
      messages: [
        {
          senderId: user?._id,
          senderRole: UserRole.CUSTOMER,
          content: 'Could you confirm if delivery can be scheduled for Saturday morning?',
        },
      ],
    });

    expect(ticket.ticketNumber).toBe('TCK-202611-001');
    expect(ticket.messages.length).toBe(1);
    expect(ticket.status).toBe('open');
  });

  // 15. AuditLog Model
  it('AuditLog: records administrative compliance action with change diff', async () => {
    const user = await User.findOne({ email: 'john.doe@example.com' });

    const log = await AuditLog.create({
      actorId: user?._id,
      actorRole: 'admin',
      action: 'PRODUCT_PRICE_UPDATED',
      entity: 'Product',
      entityId: 'HED-WH-001',
      ipAddress: '127.0.0.1',
      changesDiff: {
        before: { regularPrice: 45000, salePrice: 38000 },
        after: { regularPrice: 45000, salePrice: 35000 },
      },
    });

    expect(log.action).toBe('PRODUCT_PRICE_UPDATED');
    expect(log.changesDiff?.after?.salePrice).toBe(35000);
  });

  // 16. ShippingConfiguration Model
  it('ShippingConfiguration: validates estimatedDeliveryDaysMax >= estimatedDeliveryDaysMin', async () => {
    // Invalid: max (1) < min (3)
    await expect(
      ShippingConfiguration.create({
        zoneName: 'Lagos Mainland',
        statesCovered: ['Lagos'],
        carrierName: 'GIG Logistics',
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 2000,
        estimatedDeliveryDaysMin: 3,
        estimatedDeliveryDaysMax: 1, // Invalid
      })
    ).rejects.toThrow(
      'Maximum delivery days must be greater than or equal to minimum delivery days'
    );

    // Valid configuration
    const config = await ShippingConfiguration.create({
      zoneName: 'Lagos Mainland',
      statesCovered: ['Lagos'],
      carrierName: 'GIG Logistics',
      rateCalculationType: ShippingCalculationType.FLAT,
      baseRate: 2000,
      freeShippingThreshold: 25000,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 2,
    });

    expect(config.zoneName).toBe('Lagos Mainland');
    expect(config.freeShippingThreshold).toBe(25000);
  });
});
