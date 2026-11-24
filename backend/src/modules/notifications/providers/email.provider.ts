import { NotificationChannel } from '@shared/enums.js';
import { emailService } from '../../../services/email.service.js';
import { logger } from '../../../config/logger.js';

export interface EmailProviderPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface ProviderDeliveryResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
  simulated?: boolean;
}

export class EmailProvider {
  public readonly channel = NotificationChannel.EMAIL;
  public readonly providerName = 'nodemailer_smtp';

  /**
   * Dispatches transactional email through the centralized EmailService.
   */
  public async send(payload: EmailProviderPayload): Promise<ProviderDeliveryResult> {
    try {
      const result = await emailService.sendEmail({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      if (!result.success) {
        return {
          success: false,
          provider: this.providerName,
          error: 'Email dispatch failed at SMTP transport.',
          simulated: result.simulated,
        };
      }

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: result.messageId || `sim_${Date.now()}`,
        simulated: result.simulated,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown email provider error';
      logger.error({ error: msg, to: payload.to }, 'EmailProvider delivery exception');
      return {
        success: false,
        provider: this.providerName,
        error: msg,
      };
    }
  }
}

export const emailProvider = new EmailProvider();
