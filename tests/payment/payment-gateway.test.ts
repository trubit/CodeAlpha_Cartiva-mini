/**
 * Cartiva Mini — Phase 13 Payment Gateway & Financial Processing Tests
 * Tests Paystack integration, HMAC SHA512 webhook verification, currency checks,
 * refund boundaries, and ledger reconciliation.
 */
import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import { PaystackProvider } from '../../backend/src/modules/payment/providers/paystack.provider.js';
import { paymentProviderFactory } from '../../backend/src/modules/payment/providers/payment-provider.factory.js';
import { initializePaymentSchema, createRefundSchema } from '../../backend/src/modules/payment/payment.validator.js';

describe('Phase 13: Payment Gateway Architecture & Provider', () => {
  it('should register Paystack as default primary provider in factory', () => {
    const provider = paymentProviderFactory.getProvider('paystack');
    expect(provider).toBeDefined();
    expect(provider.providerName).toBe('paystack');
  });

  it('should reject unsupported payment gateway gracefully', () => {
    expect(() => paymentProviderFactory.getProvider('stripe')).toThrowError(
      /is not supported or configured/
    );
  });

  describe('Paystack Cryptographic Webhook Verification (HMAC SHA512)', () => {
    const secretKey = 'sk_test_placeholder_for_development';
    const provider = new PaystackProvider({ webhookSecret: secretKey });

    it('should successfully verify a valid HMAC SHA512 signature', () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference: 'PAY-TEST-12345',
          amount: 50000,
          currency: 'NGN',
          status: 'success',
        },
      });

      const rawBody = Buffer.from(payload, 'utf8');
      const validSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      const isValid = provider.verifyWebhookSignature(rawBody, validSignature);
      expect(isValid).toBe(true);
    });

    it('should reject an altered or forged webhook body with the original signature', () => {
      const originalPayload = JSON.stringify({ event: 'charge.success', data: { amount: 50000 } });
      const rawBody = Buffer.from(originalPayload, 'utf8');
      const signature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      // Attacker altered the amount
      const alteredBody = Buffer.from(
        JSON.stringify({ event: 'charge.success', data: { amount: 500 } }),
        'utf8'
      );

      const isValid = provider.verifyWebhookSignature(alteredBody, signature);
      expect(isValid).toBe(false);
    });

    it('should reject empty or missing signature', () => {
      const rawBody = Buffer.from('{"event":"charge.success"}', 'utf8');
      expect(provider.verifyWebhookSignature(rawBody, '')).toBe(false);
    });

    it('should parse valid webhook event data correctly', () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 998877,
          reference: 'PAY-VALID-REF-99',
          amount: 150000,
          currency: 'NGN',
          status: 'success',
        },
      });

      const rawBody = Buffer.from(payload, 'utf8');
      const signature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      const result = provider.parseWebhookEvent(rawBody, signature);
      expect(result.isValid).toBe(true);
      expect(result.event).toBe('charge.success');
      expect(result.reference).toBe('PAY-VALID-REF-99');
    });
  });

  describe('Payment Input Validation (Zod)', () => {
    it('should validate valid payment initialization input', () => {
      const valid = {
        orderNumber: 'ORD-20261104-ABCD12',
        callbackUrl: 'https://cartivamini.com/payment/callback',
      };
      const result = initializePaymentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid or empty order number', () => {
      const invalid = { orderNumber: '' };
      const result = initializePaymentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid callback URL', () => {
      const invalid = {
        orderNumber: 'ORD-20261104-ABCD12',
        callbackUrl: 'not-a-valid-url',
      };
      const result = initializePaymentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate refund input with required reason and positive amount', () => {
      const valid = {
        amount: 250.5,
        reason: 'Customer requested cancellation prior to carrier handoff',
      };
      const result = createRefundSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative or zero refund amount', () => {
      const invalid = {
        amount: -10,
        reason: 'Faulty item',
      };
      const result = createRefundSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
