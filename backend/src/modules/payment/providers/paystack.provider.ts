/**
 * Cartiva Mini — Official Paystack Payment Gateway Provider Adapter
 * Implements IPaymentProvider using official Paystack REST APIs with HMAC SHA512 verification,
 * integer minor-unit amount handling, and structured error mapping.
 */
import crypto from 'crypto';
import axios, { type AxiosInstance } from 'axios';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppError } from '../../../utils/AppError.js';
import { ErrorCodes } from '../../../constants/errorCodes.js';
import { HttpStatus } from '../../../constants/httpStatusCodes.js';
import type {
  IPaymentProvider,
  InitializePaymentParams,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  ProcessRefundParams,
  ProcessRefundResponse,
  VerifyWebhookResult,
} from './payment-provider.interface.js';

export class PaystackProvider implements IPaymentProvider {
  public readonly providerName = 'paystack';
  private readonly client: AxiosInstance;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(config?: { secretKey?: string; webhookSecret?: string; baseURL?: string }) {
    this.secretKey = config?.secretKey || env.PAYSTACK_SECRET_KEY;
    this.webhookSecret =
      config?.webhookSecret ||
      env.PAYSTACK_WEBHOOK_SECRET ||
      this.secretKey ||
      env.PAYSTACK_SECRET_KEY;
    const baseURL = config?.baseURL || env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

    this.client = axios.create({
      baseURL,
      timeout: 25000,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initializes a transaction with Paystack and retrieves the hosted authorization URL.
   */
  public async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResponse> {
    try {
      const sanitizedEmail = (params.customerEmail || '').trim().toLowerCase();
      const payload: Record<string, unknown> = {
        reference: params.reference,
        amount: Math.round(params.amountMinor),
        email: sanitizedEmail,
        currency: params.currency.toUpperCase(),
        metadata: {
          ...params.metadata,
          custom_fields: [
            {
              display_name: 'Customer Phone',
              variable_name: 'customer_phone',
              value: params.customerPhone || 'N/A',
            },
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: params.customerName || 'Customer',
            },
          ],
        },
      };

      if (params.callbackUrl) {
        payload.callback_url = params.callbackUrl;
      }

      const res = await this.client.post('/transaction/initialize', payload);

      if (!res.data?.status || !res.data?.data) {
        throw new AppError(
          res.data?.message || 'Paystack rejected payment initialization.',
          HttpStatus.BAD_GATEWAY,
          ErrorCodes.BAD_GATEWAY
        );
      }

      return {
        reference: res.data.data.reference || params.reference,
        authorizationUrl: res.data.data.authorization_url,
        accessCode: res.data.data.access_code,
        rawResponse: res.data.data,
      };
    } catch (err: unknown) {
      this.handleAxiosError(err, 'Paystack payment initialization failed');
    }
  }

  /**
   * Performs authoritative server-side transaction verification against Paystack.
   */
  public async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    try {
      const res = await this.client.get(`/transaction/verify/${encodeURIComponent(reference)}`);

      if (!res.data?.status || !res.data?.data) {
        throw new AppError(
          res.data?.message || 'Unable to verify transaction with Paystack.',
          HttpStatus.BAD_GATEWAY,
          ErrorCodes.BAD_GATEWAY
        );
      }

      const d = res.data.data;
      let status: 'success' | 'failed' | 'abandoned' | 'pending' = 'pending';

      if (d.status === 'success') {
        status = 'success';
      } else if (d.status === 'failed') {
        status = 'failed';
      } else if (d.status === 'abandoned') {
        status = 'abandoned';
      }

      return {
        reference: d.reference || reference,
        gatewayTransactionId: String(d.id),
        status,
        amountMinor: Number(d.amount),
        currency: String(d.currency).toUpperCase(),
        channel: d.channel,
        paidAt: d.paid_at ? new Date(d.paid_at) : undefined,
        ipAddress: d.ip_address,
        gatewayFeeMinor: d.fees ? Number(d.fees) : 0,
        customerEmail: d.customer?.email,
        rawResponse: d,
      };
    } catch (err: unknown) {
      this.handleAxiosError(err, `Paystack verification failed for reference '${reference}'`);
    }
  }

  /**
   * Cryptographically verifies Paystack webhook signature using HMAC SHA512.
   */
  public verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!rawBody || !signature || typeof signature !== 'string') {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha512', this.webhookSecret);
      const computedHash = hmac.update(rawBody).digest('hex');

      // Use constant-time buffer comparison to prevent timing side-channel attacks
      const signatureBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');
      const computedBuf = Buffer.from(computedHash.toLowerCase(), 'utf8');

      if (signatureBuf.length !== computedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuf, computedBuf);
    } catch (err: unknown) {
      logger.error({ err }, 'Error during webhook signature verification');
      return false;
    }
  }

  /**
   * Parses and validates raw webhook event payload after cryptographic verification.
   */
  public parseWebhookEvent(rawBody: Buffer, signature: string): VerifyWebhookResult {
    const isValid = this.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return { isValid: false };
    }

    try {
      const parsed = JSON.parse(rawBody.toString('utf8'));
      const event = parsed.event as string | undefined;
      const data = parsed.data as Record<string, unknown> | undefined;
      const reference = (data?.reference || data?.transaction_reference) as string | undefined;

      return {
        isValid: true,
        event,
        data,
        reference,
      };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Initiates a refund request via Paystack's official Refund API.
   */
  public async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResponse> {
    try {
      const payload: Record<string, unknown> = {
        transaction: params.transactionReference,
        customer_note: params.customerNote || 'Refund requested by store administration',
        merchant_note: params.merchantNote || 'Administrative refund initiated from Cartiva Mini',
      };

      if (params.amountMinor !== undefined && params.amountMinor > 0) {
        payload.amount = Math.round(params.amountMinor);
      }

      if (params.currency) {
        payload.currency = params.currency.toUpperCase();
      }

      const res = await this.client.post('/refund', payload);

      if (!res.data?.status || !res.data?.data) {
        throw new AppError(
          res.data?.message || 'Paystack refund request failed.',
          HttpStatus.BAD_GATEWAY,
          ErrorCodes.BAD_GATEWAY
        );
      }

      const d = res.data.data;
      let status: 'pending' | 'processed' | 'failed' = 'pending';
      if (d.status === 'processed') {
        status = 'processed';
      } else if (d.status === 'failed') {
        status = 'failed';
      }

      return {
        refundReference: d.refund_reference || `REF-${Date.now()}`,
        gatewayRefundId: String(d.id || ''),
        status,
        amountMinor: Number(d.amount),
        currency: String(d.currency || 'NGN').toUpperCase(),
        rawResponse: d,
      };
    } catch (err: unknown) {
      this.handleAxiosError(err, 'Paystack refund processing failed');
    }
  }

  /**
   * Fetches transaction details directly from Paystack.
   */
  public async fetchTransaction(reference: string): Promise<VerifyPaymentResponse> {
    return this.verifyPayment(reference);
  }

  /**
   * Internal helper: sanitizes and translates Axios HTTP errors into domain AppError instances.
   */
  private handleAxiosError(err: unknown, defaultMessage: string): never {
    if (axios.isAxiosError(err)) {
      const responseData = err.response?.data as { message?: string } | undefined;
      const apiMessage = responseData?.message || err.message;
      const statusCode = err.response?.status || HttpStatus.BAD_GATEWAY;

      logger.warn(
        {
          statusCode,
          apiMessage,
          url: err.config?.url,
        },
        'Payment gateway provider HTTP error'
      );

      // Map 404s cleanly
      if (statusCode === 404) {
        throw new AppError(
          `Transaction reference not found on gateway: ${apiMessage}`,
          HttpStatus.NOT_FOUND,
          ErrorCodes.NOT_FOUND
        );
      }

      throw new AppError(
        `${defaultMessage}: ${apiMessage}`,
        statusCode >= 400 && statusCode < 500 ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY,
        ErrorCodes.BAD_GATEWAY
      );
    }

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}
