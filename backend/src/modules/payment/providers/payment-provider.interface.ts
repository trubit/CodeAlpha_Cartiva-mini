/**
 * Cartiva Mini — Provider-Agnostic Payment Provider Interface
 * Defines standardized contract for payment initialization, server-side verification,
 * cryptographic webhook validation, and refund processing.
 */

export interface InitializePaymentParams {
  reference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode?: string;
  rawResponse?: unknown;
}

export interface VerifyPaymentResponse {
  reference: string;
  gatewayTransactionId: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountMinor: number;
  currency: string;
  channel?: string;
  paidAt?: Date;
  ipAddress?: string;
  gatewayFeeMinor?: number;
  customerEmail?: string;
  rawResponse?: unknown;
}

export interface ProcessRefundParams {
  transactionReference: string;
  amountMinor?: number;
  currency?: string;
  customerNote?: string;
  merchantNote?: string;
}

export interface ProcessRefundResponse {
  refundReference: string;
  gatewayRefundId?: string;
  status: 'pending' | 'processed' | 'failed';
  amountMinor: number;
  currency: string;
  rawResponse?: unknown;
}

export interface VerifyWebhookResult {
  isValid: boolean;
  event?: string;
  data?: Record<string, unknown>;
  reference?: string;
}

export interface IPaymentProvider {
  readonly providerName: string;
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResponse>;
  verifyPayment(reference: string): Promise<VerifyPaymentResponse>;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  parseWebhookEvent(rawBody: Buffer, signature: string): VerifyWebhookResult;
  processRefund(params: ProcessRefundParams): Promise<ProcessRefundResponse>;
  fetchTransaction(reference: string): Promise<VerifyPaymentResponse>;
}
