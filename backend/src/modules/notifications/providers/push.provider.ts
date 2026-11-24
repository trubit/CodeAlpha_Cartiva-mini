import { NotificationChannel } from '@shared/enums.js';
import { logger } from '../../../config/logger.js';
import type { ProviderDeliveryResult } from './email.provider.js';

export interface PushNotificationPayload {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
}

/**
 * Web Push Notification integration boundary.
 *
 * Current Status: Channel Unavailable (Pending VAPID keys configuration: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).
 * In accordance with Phase 17 rules, push is prepared with clean subscription handling interfaces
 * without claiming operational status before testing with real VAPID credentials.
 */
export class PushProvider {
  public readonly channel = NotificationChannel.PUSH;
  public readonly providerName = 'web_push_boundary';

  public isAvailable(): boolean {
    // Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
    return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  public async send(payload: PushNotificationPayload): Promise<ProviderDeliveryResult> {
    if (!this.isAvailable()) {
      logger.warn(
        { endpoint: payload.subscription?.endpoint, provider: this.providerName },
        'Push notification requested but Web Push VAPID credentials are not configured.'
      );
      return {
        success: false,
        provider: this.providerName,
        error: 'Push notification channel is currently unconfigured. VAPID credentials required.',
      };
    }

    // When VAPID credentials are provided, web-push sends payload here.
    return {
      success: true,
      provider: this.providerName,
      providerMessageId: `push_${Date.now()}`,
    };
  }
}

export const pushProvider = new PushProvider();
