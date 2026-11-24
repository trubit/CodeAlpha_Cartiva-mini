/**
 * Cartiva Mini — Secure Paystack Webhook Controller
 * Handles cryptographically verified events (HMAC SHA512) directly from Paystack.
 */
import type { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { logger } from '../../config/logger.js';

export class WebhookController {
  /**
   * POST /api/v1/webhooks/paystack
   * Receives incoming webhook events from Paystack.
   */
  public async handlePaystackWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-paystack-signature'] as string) || '';

      // Access the raw buffer captured during express.json verification
      const rawBody =
        (req as unknown as { rawBody?: Buffer }).rawBody ||
        Buffer.from(JSON.stringify(req.body || {}), 'utf8');

      if (!signature) {
        logger.warn('Incoming webhook rejected: Missing x-paystack-signature header');
        res.status(401).json({ status: false, message: 'Missing signature.' });
        return;
      }

      const result = await paymentService.processWebhook(rawBody, signature);

      // Paystack requires an immediate HTTP 200 response to acknowledge delivery
      res.status(200).json({
        status: true,
        message: 'Webhook received and processed.',
        data: result,
      });
    } catch (err: unknown) {
      logger.error({ err }, 'Error handling Paystack webhook');
      next(err);
    }
  }
}

export const webhookController = new WebhookController();
