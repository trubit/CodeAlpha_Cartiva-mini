import { Types } from 'mongoose';
import { NotificationPreference } from '../../models/NotificationPreference.model.js';
import { NotificationType, NotificationChannel } from '@shared/enums.js';
import type {
  NotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from '@shared/api.types.js';

export class NotificationPreferenceService {
  /**
   * Retrieves or creates default preferences for a customer.
   */
  public async getPreferences(userId: string): Promise<NotificationPreferenceDto> {
    const userObjectId = new Types.ObjectId(userId);
    let prefs = await NotificationPreference.findOne({ userId: userObjectId });

    if (!prefs) {
      prefs = await NotificationPreference.create({
        userId: userObjectId,
        orderUpdates: true,
        securityAlerts: true,
        promotionalEmails: false,
        newsletter: false,
        inAppAlerts: true,
        smsAlerts: false,
        pushAlerts: false,
      });
    }

    return {
      userId: prefs.userId.toString(),
      orderUpdates: true, // Always enforced true
      securityAlerts: true, // Always enforced true
      promotionalEmails: prefs.promotionalEmails,
      newsletter: prefs.newsletter,
      inAppAlerts: prefs.inAppAlerts,
      smsAlerts: prefs.smsAlerts,
      pushAlerts: prefs.pushAlerts,
      updatedAt: prefs.updatedAt ? prefs.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Updates customer communication preferences.
   * Strictly enforces that transactional order and security updates cannot be disabled.
   */
  public async updatePreferences(
    userId: string,
    updates: UpdateNotificationPreferenceDto
  ): Promise<NotificationPreferenceDto> {
    const userObjectId = new Types.ObjectId(userId);

    const updated = await NotificationPreference.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          ...(updates.promotionalEmails !== undefined && {
            promotionalEmails: updates.promotionalEmails,
          }),
          ...(updates.newsletter !== undefined && { newsletter: updates.newsletter }),
          ...(updates.inAppAlerts !== undefined && { inAppAlerts: updates.inAppAlerts }),
          ...(updates.smsAlerts !== undefined && { smsAlerts: updates.smsAlerts }),
          ...(updates.pushAlerts !== undefined && { pushAlerts: updates.pushAlerts }),
          // Guarantee mandatory transactional alerts remain true
          orderUpdates: true,
          securityAlerts: true,
        },
      },
      { new: true, upsert: true }
    );

    return {
      userId: updated.userId.toString(),
      orderUpdates: true,
      securityAlerts: true,
      promotionalEmails: updated.promotionalEmails,
      newsletter: updated.newsletter,
      inAppAlerts: updated.inAppAlerts,
      smsAlerts: updated.smsAlerts,
      pushAlerts: updated.pushAlerts,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Checks whether communication is permissible for a given user, type, and channel.
   * Essential transactional & security events are mandatory and cannot be opted out of.
   */
  public async isNotificationPermitted(
    userId: string | undefined,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    // If not user-specific (e.g. guest order or admin system alert), permit transactional channels
    if (!userId) {
      return type !== NotificationType.PROMOTION;
    }

    // Essential transactional & security types cannot be opted out
    const isMandatoryTransactional = [
      NotificationType.ACCOUNT_WELCOME,
      NotificationType.EMAIL_VERIFICATION,
      NotificationType.PASSWORD_RESET,
      NotificationType.PASSWORD_CHANGED,
      NotificationType.SECURITY_ALERT,
      NotificationType.ORDER_CONFIRMED,
      NotificationType.ORDER_STATUS,
      NotificationType.ORDER_PROCESSING,
      NotificationType.ORDER_DISPATCHED,
      NotificationType.DELIVERY_UPDATE,
      NotificationType.DELIVERY_COMPLETED,
      NotificationType.ORDER_CANCELLED,
      NotificationType.PAYMENT_SUCCESS,
      NotificationType.PAYMENT_FAILED,
      NotificationType.REFUND_UPDATE,
      NotificationType.SUPPORT_RESPONSE,
      NotificationType.LOW_STOCK,
      NotificationType.OUT_OF_STOCK,
    ].includes(type);

    if (isMandatoryTransactional) {
      return true;
    }

    // Optional promotional / marketing types require explicit consent
    const prefs = await this.getPreferences(userId);

    if (channel === NotificationChannel.EMAIL) {
      return prefs.promotionalEmails || prefs.newsletter;
    }
    if (channel === NotificationChannel.IN_APP) {
      return prefs.inAppAlerts;
    }
    if (channel === NotificationChannel.SMS) {
      return prefs.smsAlerts;
    }
    if (channel === NotificationChannel.PUSH) {
      return prefs.pushAlerts;
    }

    return false;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
