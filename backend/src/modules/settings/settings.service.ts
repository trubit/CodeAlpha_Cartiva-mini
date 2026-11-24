/**
 * Cartiva Mini — Platform Settings Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { Types } from 'mongoose';
import { PlatformSettings, AuditLog, type PlatformSettingsDocument } from '../../models/index.js';
import type { PlatformSettingsDto, UpdatePlatformSettingsDto } from '@shared/api.types.js';

export class SettingsService {
  private mapToDto(settings: PlatformSettingsDocument): PlatformSettingsDto {
    return {
      storeName: settings.storeName,
      storeDescription: settings.storeDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      storeAddress: settings.storeAddress,
      defaultCurrency: settings.defaultCurrency,
      supportedCurrencies: settings.supportedCurrencies,
      freeShippingThresholdMinor: settings.freeShippingThresholdMinor,
      lowStockAlertThreshold: settings.lowStockAlertThreshold,
      orderAutoCancellationMinutes: settings.orderAutoCancellationMinutes,
      supportEmail: settings.supportEmail,
      policies: settings.policies || {},
      updatedAt: settings.updatedAt.toISOString(),
      updatedBy: settings.updatedBy ? settings.updatedBy.toString() : undefined,
    };
  }

  /**
   * Retrieves active platform settings singleton or creates default if not initialized.
   */
  public async getSettings(): Promise<PlatformSettingsDto> {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    return this.mapToDto(settings);
  }

  /**
   * Updates non-sensitive platform settings with audit log recording.
   */
  public async updateSettings(
    dto: UpdatePlatformSettingsDto,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<PlatformSettingsDto> {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const previousState = settings.toObject();

    if (dto.storeName !== undefined) settings.storeName = dto.storeName;
    if (dto.storeDescription !== undefined) settings.storeDescription = dto.storeDescription;
    if (dto.contactEmail !== undefined) settings.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) settings.contactPhone = dto.contactPhone;
    if (dto.storeAddress !== undefined) settings.storeAddress = dto.storeAddress;
    if (dto.freeShippingThresholdMinor !== undefined)
      settings.freeShippingThresholdMinor = dto.freeShippingThresholdMinor;
    if (dto.lowStockAlertThreshold !== undefined)
      settings.lowStockAlertThreshold = dto.lowStockAlertThreshold;
    if (dto.orderAutoCancellationMinutes !== undefined)
      settings.orderAutoCancellationMinutes = dto.orderAutoCancellationMinutes;
    if (dto.supportEmail !== undefined) settings.supportEmail = dto.supportEmail;

    if (dto.policies) {
      settings.policies = {
        ...settings.policies,
        ...dto.policies,
      };
    }

    if (actorId) {
      settings.updatedBy = new Types.ObjectId(actorId);
    }

    await settings.save();

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'PLATFORM_SETTINGS_UPDATED',
        entity: 'PlatformSettings',
        entityId: settings._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { before: previousState, after: settings.toObject() },
      });
    }

    return this.mapToDto(settings);
  }
}

export const settingsService = new SettingsService();
