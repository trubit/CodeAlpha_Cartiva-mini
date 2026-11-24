/**
 * Cartiva Mini — Checkout & Order Processing Constants
 */
export const CHECKOUT_CONSTANTS = {
  SESSION_TTL_MINUTES: 30,
  DEFAULT_CURRENCY: 'NGN',
  ORDER_NUMBER_PREFIX: 'ORD',
  DEFAULT_TAX_RATE: 0, // No unapproved taxes
  MAX_CUSTOMER_NOTES_LENGTH: 500,
  RESERVATION_TTL_MINUTES: 30,
} as const;
