import type {
  UserRole,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ProductStatus,
  TransactionType,
  ReviewStatus,
  DiscountType,
  InventoryMovementType,
  ReservationStatus,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  ShippingCalculationType,
  CheckoutStep,
  ShipmentStatus,
  TrackingEventSource,
} from './enums.js';

export interface IUser {
  _id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  tokenVersion?: number;
  avatarUrl?: string;
  pendingEmail?: string;
  emailChangeToken?: string;
  emailChangeExpires?: Date;
  deactivationReason?: string;
  deletionRequestedAt?: Date;
  deletionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductImage {
  publicId: string;
  url: string;
  alt?: string;
  isThumbnail: boolean;
  displayOrder: number;
}

export interface IProductVariant {
  _id?: string;
  variantId?: string;
  sku: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  stockQuantity: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  isInventoryTracked?: boolean;
  imageUrl?: string;
}

export interface IProduct {
  _id: string;
  title: string;
  name?: string;
  slug: string;
  previousSlugs?: string[];
  sku: string;
  barcode?: string;
  brand?: string;
  shortDescription: string;
  fullDescription: string;
  regularPrice: number;
  salePrice?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  costPrice?: number;
  currency: string;
  categoryId: string;
  subCategoryId?: string;
  images: IProductImage[];
  hasVariants: boolean;
  variants: IProductVariant[];
  attributes?: Record<string, unknown>;
  stockQuantity: number;
  reservedQuantity?: number;
  lowStockThreshold: number;
  isInventoryTracked?: boolean;
  weightGrams?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  averageRating: number;
  reviewCount: number;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  _id?: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  thumbnailUrl?: string;
}

export interface ICart {
  _id: string;
  userId?: string;
  sessionId?: string;
  items: ICartItem[];
  currency?: string;
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWishlistItem {
  _id?: string;
  productId: string;
  addedAt: Date;
}

export interface IWishlist {
  _id: string;
  userId: string;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  unitPrice: number;
  unitPriceMinor?: number;
  quantity: number;
  subtotal: number;
  subtotalMinor?: number;
  thumbnailUrl?: string;
}

export interface IAddressSnapshot {
  recipientName: string;
  phone: string;
  streetAddress: string;
  apartmentSuite?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItem[];
  shippingAddress: IAddressSnapshot;
  billingAddress?: IAddressSnapshot;
  subtotal: number;
  subtotalMinor?: number;
  discountAmount: number;
  discountAmountMinor?: number;
  couponCode?: string;
  shippingFee: number;
  shippingFeeMinor?: number;
  taxAmount: number;
  taxAmountMinor?: number;
  totalAmount: number;
  totalAmountMinor?: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  shippingMethodId?: string;
  shippingMethodName?: string;
  estimatedDeliveryText?: string;
  reservationReference?: string;
  checkoutSessionId?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckoutSession {
  _id: string;
  sessionId: string;
  userId: string;
  cartId: string;
  shippingAddressId?: string;
  shippingAddressSnapshot?: IAddressSnapshot;
  shippingMethodId?: string;
  shippingMethodSnapshot?: {
    methodId: string;
    methodName: string;
    carrierName?: string;
    fee: number;
    feeMinor: number;
    currency: string;
    estimatedDeliveryText: string;
    isFreeShipping: boolean;
  };
  step: CheckoutStep;
  subtotalMinor: number;
  shippingFeeMinor: number;
  discountAmountMinor: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
  orderId?: string;
  orderNumber?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  _id: string;
  paymentReference: string;
  orderId: string;
  userId: string;
  customerEmail: string;
  amount: number;
  amountMinor: number;
  currency: string;
  gateway: string;
  gatewayTransactionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  channel?: string;
  status: PaymentStatus;
  gatewayResponse?: Record<string, unknown>;
  ipAddress?: string;
  refundedAmountMinor?: number;
  metadata?: Record<string, unknown>;
  paidAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  _id: string;
  transactionReference: string;
  paymentId?: string;
  orderId?: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  amountMinor: number;
  currency: string;
  gatewayFee?: number;
  gatewayFeeMinor?: number;
  netAmount?: number;
  netAmountMinor?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status?: string;
  description?: string;
  timestamp: Date;
}

export interface IRefund {
  _id: string;
  refundReference: string;
  paymentId: string;
  paymentReference: string;
  orderId: string;
  userId: string;
  initiatedBy: string;
  amount: number;
  amountMinor: number;
  currency: string;
  reason: string;
  customerNote?: string;
  merchantNote?: string;
  status: RefundStatus;
  gateway: string;
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookEvent {
  _id: string;
  eventId: string;
  event: string;
  gateway: string;
  reference: string;
  payload: Record<string, unknown>;
  signature: string;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface IReconciliationRecord {
  _id: string;
  reconciliationId: string;
  paymentReference: string;
  orderReference: string;
  internalAmountMinor: number;
  providerAmountMinor: number;
  currency: string;
  internalStatus: string;
  providerStatus: string;
  matched: boolean;
  discrepancies: string[];
  reconciledAt: Date;
  reconciledBy: string;
}

export interface IReview {
  _id: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  isVerifiedBuyer: boolean;
  status: ReviewStatus;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoupon {
  _id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate: Date;
  expiryDate: Date;
  usageLimitTotal?: number;
  usageLimitPerUser: number;
  usedCount: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddress {
  _id: string;
  userId: string;
  recipientName: string;
  phone: string;
  streetAddress: string;
  apartmentSuite?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  deliveryInstructions?: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryMovement {
  _id: string;
  productId: string;
  variantId?: string;
  sku: string;
  movementType: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: 'order' | 'purchase_order' | 'manual';
  referenceId?: string;
  operatorId?: string;
  reason: string;
  timestamp: Date;
}

export interface IInventoryReservationItem {
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
}

export interface IInventoryReservation {
  _id: string;
  reservationId: string;
  userId?: string;
  sessionId?: string;
  items: IInventoryReservationItem[];
  status: ReservationStatus;
  expiresAt: Date;
  idempotencyKey?: string;
  confirmedAt?: Date;
  releasedAt?: Date;
  referenceType?: 'cart' | 'checkout' | 'order' | 'manual';
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface INotificationPreference {
  _id: string;
  userId: string;
  orderUpdates: boolean;
  securityAlerts: boolean;
  promotionalEmails: boolean;
  newsletter: boolean;
  inAppAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationOutbox {
  _id: string;
  eventId: string;
  eventType: NotificationType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  content: {
    subject?: string;
    body: string;
    html?: string;
    actionUrl?: string;
    templateId?: string;
    metadata?: Record<string, unknown>;
  };
  status: NotificationDeliveryStatus;
  priority: NotificationPriority;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  errorMessage?: string;
  providerMessageId?: string;
  lockedAt?: Date;
  lockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDelivery {
  _id: string;
  outboxId: string;
  channel: NotificationChannel;
  provider: string;
  status: NotificationDeliveryStatus;
  recipient: string;
  providerResponse?: Record<string, unknown>;
  providerMessageId?: string;
  attemptNumber: number;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface ISupportMessage {
  messageId?: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  attachments?: string[];
  sentAt: Date;
}

export interface ISupportTicket {
  _id: string;
  ticketNumber: string;
  userId: string;
  orderId?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  messages: ISupportMessage[];
  assignedTo?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  changesDiff?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  timestamp: Date;
}

export interface IShippingConfiguration {
  _id: string;
  zoneName: string;
  methodName: string;
  description?: string;
  countriesCovered: string[];
  statesCovered: string[];
  carrierName: string;
  rateCalculationType: ShippingCalculationType;
  baseRate: number;
  ratePerAdditionalKg: number;
  freeShippingThreshold?: number;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  _id: string;
  userId: string;
  sessionId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrackingEvent {
  eventId: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  location?: string;
  timestamp: Date;
  source: TrackingEventSource;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export interface IShipment {
  _id: string;
  shipmentReference: string;
  orderId: string;
  orderNumber: string;
  carrierName: string;
  carrierService?: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippingMethod: string;
  status: ShipmentStatus;
  originAddress?: IAddressSnapshot;
  destinationAddress: IAddressSnapshot;
  dispatchedAt?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveredTo?: string;
  deliveryNotes?: string;
  proofOfDeliveryUrl?: string;
  responsibleStaffId?: string;
  responsibleStaffName?: string;
  events: ITrackingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlatformSettings {
  _id: string;
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  storeAddress: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  freeShippingThresholdMinor: number;
  lowStockAlertThreshold: number;
  orderAutoCancellationMinutes: number;
  supportEmail: string;
  policies: {
    privacyPolicy?: string;
    returnPolicy?: string;
    termsOfService?: string;
  };
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

