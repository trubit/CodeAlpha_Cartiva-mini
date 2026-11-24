/**
 * Cartiva Mini — Shopping Cart & Wishlist Domain Constants
 */
import type { CookieOptions } from 'express';
import { env } from '../../config/env.js';

export const CART_CONSTANTS = {
  // Quantity limits
  MIN_QUANTITY_PER_ITEM: 1,
  DEFAULT_QUANTITY: 1,
  MAX_QUANTITY_PER_ITEM: 99,

  // Guest Cart Sessions
  GUEST_CART_TTL_DAYS: 30,
  GUEST_CART_TTL_SECONDS: 30 * 24 * 60 * 60,
  GUEST_CART_HEADER: 'x-guest-cart-token',
  GUEST_CART_ALT_HEADER: 'x-cart-token',
  GUEST_CART_COOKIE_NAME: 'cartiva_guest_cart_token',

  // Currency
  DEFAULT_CURRENCY: 'NGN',
} as const;

export const GUEST_CART_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: CART_CONSTANTS.GUEST_CART_TTL_SECONDS * 1000,
  path: '/',
};

export const CLEAR_GUEST_CART_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 0,
  path: '/',
};
