/**
 * Cartiva Mini — Webhook Routes
 * Public webhook endpoint for payment gateway notifications.
 */
import { Router } from 'express';
import { webhookController } from './webhook.controller.js';

export const webhookRouter = Router();

// Paystack webhook notification receiver (cryptographically verified via HMAC SHA512)
webhookRouter.post('/paystack', webhookController.handlePaystackWebhook);
