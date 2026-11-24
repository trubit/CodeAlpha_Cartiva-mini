/**
 * Cartiva Mini — Paystack Inline JS Global Typings
 * Official interface definitions for window.PaystackPop
 */
export interface PaystackTransactionResponse {
  reference: string;
  trans?: string;
  status: string;
  message?: string;
  transaction?: string;
  trxref?: string;
}

export interface PaystackSetupOptions {
  key: string;
  email: string;
  amount?: number;
  currency?: string;
  ref?: string;
  access_code?: string;
  callback?: (response: PaystackTransactionResponse) => void;
  onClose?: () => void;
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaystackPopInstance {
  openIframe: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => PaystackPopInstance;
    };
  }
}

