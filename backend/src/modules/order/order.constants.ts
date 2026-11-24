/**
 * Cartiva Mini — Order Processing Constants & Status Transitions
 */
import { OrderStatus } from '@shared/enums.js';

export const ORDER_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

/**
 * Order status lifecycle and permitted state transitions.
 * Order creation begins at PENDING_PAYMENT.
 * Payment verification (Phase 13) converts PENDING_PAYMENT -> CONFIRMED.
 */
export const PERMITTED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAYMENT_PROCESSING,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
    OrderStatus.PAYMENT_FAILED,
  ],
  [OrderStatus.PAYMENT_PROCESSING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PACKED,
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.CANCELLED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_SHIPMENT]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERY_FAILED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.DELIVERY_FAILED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.REFUND_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUND_PENDING],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED, OrderStatus.CONFIRMED],
  [OrderStatus.REFUNDED]: [],
};

export const CANCELLABLE_CUSTOMER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAYMENT_FAILED,
];
