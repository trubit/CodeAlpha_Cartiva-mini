/**
 * Cartiva Mini — Domain Enums
 * Centralized enum definitions shared across database models, backend controllers, and frontend views.
 */

export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_PROCESSING = 'payment_processing',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  PACKED = 'packed',
  READY_FOR_SHIPMENT = 'ready_for_shipment',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PENDING = 'refund_pending',
  REFUNDED = 'refunded',
  DELIVERY_FAILED = 'delivery_failed',
}

export enum ShipmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PACKED = 'packed',
  READY_FOR_PICKUP = 'ready_for_pickup',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  DELIVERY_ATTEMPTED = 'delivery_attempted',
  DELIVERY_FAILED = 'delivery_failed',
  EXCEPTION = 'exception',
  RETURNED_TO_SENDER = 'returned_to_sender',
  CANCELLED = 'cancelled',
}

export enum TrackingEventSource {
  MANUAL = 'manual',
  CARRIER = 'carrier',
  SYSTEM = 'system',
}

export enum DeliveryExceptionType {
  DELIVERY_ATTEMPTED = 'delivery_attempted',
  CUSTOMER_UNAVAILABLE = 'customer_unavailable',
  INCORRECT_ADDRESS = 'incorrect_address',
  DELIVERY_DELAYED = 'delivery_delayed',
  SHIPMENT_EXCEPTION = 'shipment_exception',
  RESCHEDULED_DELIVERY = 'rescheduled_delivery',
  RETURN_TO_SENDER = 'return_to_sender',
  DAMAGED_IN_TRANSIT = 'damaged_in_transit',
  WEATHER_DELAY = 'weather_delay',
}

export enum CheckoutStep {
  ADDRESS = 'address',
  SHIPPING = 'shipping',
  REVIEW = 'review',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
}

export enum PaymentStatus {
  INITIALIZED = 'initialized',
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
  CANCELLED = 'cancelled',
  REFUND_PENDING = 'refund_pending',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  REQUIRES_REVIEW = 'requires_review',
}

export enum RefundStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  UNPUBLISHED = 'unpublished',
}

export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  PAYOUT = 'payout',
  ADJUSTMENT = 'adjustment',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum InventoryStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  UNTRACKED = 'untracked',
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export enum InventoryMovementType {
  INITIAL_STOCK = 'initial_stock',
  RESTOCK = 'restock',
  STOCK_RECEIVED = 'stock_received',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  STOCK_CORRECTION = 'stock_correction',
  DAMAGED_STOCK = 'damaged_stock',
  LOST_STOCK = 'lost_stock',
  RETURN_RESTOCK = 'return_restock',
  RESERVATION = 'reservation',
  RESERVATION_RELEASE = 'reservation_release',
  PURCHASE_DEDUCTION = 'purchase_deduction',
}

export enum NotificationType {
  // Core / Lifecycle types
  ORDER_STATUS = 'order_status',
  PAYMENT_SUCCESS = 'payment_success',
  LOW_STOCK = 'low_stock',
  SYSTEM_ALERT = 'system_alert',
  PROMOTION = 'promotion',
  ACCOUNT_WELCOME = 'account_welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  SECURITY_ALERT = 'security_alert',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PROCESSING = 'order_processing',
  ORDER_DISPATCHED = 'order_dispatched',
  DELIVERY_UPDATE = 'delivery_update',
  DELIVERY_COMPLETED = 'delivery_completed',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_UPDATE = 'refund_update',
  SUPPORT_RESPONSE = 'support_response',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SupportTicketCategory {
  ORDER_INQUIRY = 'order_inquiry',
  PRODUCT_QUESTION = 'product_question',
  PAYMENT_ISSUE = 'payment_issue',
  RETURN_REFUND = 'return_refund',
  GENERAL = 'general',
}

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_ON_CUSTOMER = 'waiting_on_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ShippingCalculationType {
  FLAT = 'flat',
  WEIGHT_TIERED = 'weight_tiered',
  FREE_ABOVE_THRESHOLD = 'free_above_threshold',
}

export enum ProductSortOption {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  RATING = 'rating',
  POPULAR = 'popular',
}

export enum ProductAvailabilityFilter {
  ALL = 'all',
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
}
