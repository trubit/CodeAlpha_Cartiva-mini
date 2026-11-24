import { NotificationChannel } from '@shared/enums.js';
import { logger } from '../../../config/logger.js';
import type { ProviderDeliveryResult } from './email.provider.js';

export interface SmsProviderPayload {
  toPhone: string;
  message: string;
}

/**
 * Provider-independent SMS integration boundary.
 *
 * Current Status: Channel Unavailable (Pending approved SMS gateway credentials e.g. Twilio/Termii).
 * In accordance with Phase 17 requirements, this boundary is prepared without inventing endpoints
 * or integrating unapproved paid third-party providers.
 */
export class SmsProvider {
  public readonly channel = NotificationChannel.SMS;
  public readonly providerName = 'sms_gateway_boundary';

  public isAvailable(): boolean {
    // SMS provider is strictly disabled until explicit configuration and gateway credentials are provided.
    return false;
  }

  public async send(payload: SmsProviderPayload): Promise<ProviderDeliveryResult> {
    logger.warn(
      { toPhone: payload.toPhone, provider: this.providerName },
      'SMS delivery requested but SMS provider is currently unconfigured and unavailable.'
    );

    return {
      success: false,
      provider: this.providerName,
      error: 'SMS channel is currently unconfigured and unavailable. Please configure SMS credentials.',
    };
  }
}

export const smsProvider = new SmsProvider();
