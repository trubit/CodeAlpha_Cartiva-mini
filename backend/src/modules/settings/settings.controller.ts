/**
 * Cartiva Mini — Platform Settings Controller
 */
import type { Request, Response } from 'express';
import { settingsService } from './settings.service.js';
import { sendSuccess } from '../../utils/response.util.js';

class SettingsController {
  // Public store info
  public async getPublicSettings(_req: Request, res: Response): Promise<void> {
    const settings = await settingsService.getSettings();
    sendSuccess(res, {
      storeName: settings.storeName,
      storeDescription: settings.storeDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      storeAddress: settings.storeAddress,
      defaultCurrency: settings.defaultCurrency,
      supportedCurrencies: settings.supportedCurrencies,
      freeShippingThresholdMinor: settings.freeShippingThresholdMinor,
      policies: settings.policies,
    }, 'Store platform configuration retrieved.');
  }

  // Admin get complete settings
  public async getAdminSettings(_req: Request, res: Response): Promise<void> {
    const settings = await settingsService.getSettings();
    sendSuccess(res, settings, 'Platform administrative settings retrieved successfully.');
  }

  // Admin update settings
  public async updateSettings(req: Request, res: Response): Promise<void> {
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const updated = await settingsService.updateSettings(req.body, adminId, context);
    sendSuccess(res, updated, 'Platform administrative settings updated successfully.');
  }
}

export const settingsController = new SettingsController();
