import type { Request, Response } from 'express';
import { shippingService } from './shipping.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.util.js';
import { SHIPPING_CONSTANTS } from './shipping.constants.js';
import type {
  CreateShippingConfigDto,
  UpdateShippingConfigDto,
  ShippingQuoteRequestDto,
} from '@shared/api.types.js';

export class ShippingController {
  // ============================================================================
  // Customer Handlers
  // ============================================================================

  /**
   * GET /api/v1/shipping/methods
   * Lists available shipping methods for a given country and state.
   */
  public async getAvailableMethods(req: Request, res: Response): Promise<Response> {
    const country = (req.query.country as string) || SHIPPING_CONSTANTS.DEFAULT_COUNTRY;
    const state = req.query.state as string;

    const methods = await shippingService.getAvailableMethods(country, state);
    return sendSuccess(res, methods, 'Available shipping methods retrieved successfully.');
  }

  /**
   * GET /api/v1/shipping/availability
   * Checks whether delivery service is available to a destination.
   */
  public async checkAvailability(req: Request, res: Response): Promise<Response> {
    const country = (req.query.country as string) || SHIPPING_CONSTANTS.DEFAULT_COUNTRY;
    const state = req.query.state as string;

    const result = await shippingService.checkAvailability(country, state);
    return sendSuccess(res, result, 'Shipping availability checked successfully.');
  }

  /**
   * POST /api/v1/shipping/quotes
   * Authoritative calculation of shipping fee based on cart and destination.
   */
  public async calculateQuote(req: Request, res: Response): Promise<Response> {
    const context = {
      userId: req.user?.id,
      guestToken: req.headers['x-guest-token'] as string | undefined,
    };

    const quoteResponse = await shippingService.calculateAuthoritativeQuote(
      context,
      req.body as ShippingQuoteRequestDto
    );

    return sendSuccess(res, quoteResponse, 'Shipping quote calculated successfully.');
  }

  // ============================================================================
  // Administrator Handlers
  // ============================================================================

  /**
   * GET /api/v1/admin/shipping/configurations
   * Lists all shipping configurations with optional filters.
   */
  public async listConfigurations(req: Request, res: Response): Promise<Response> {
    const isActiveQuery = req.query.isActive as string | undefined;
    const isActive =
      isActiveQuery === 'true' ? true : isActiveQuery === 'false' ? false : undefined;

    const configs = await shippingService.listAllConfigurations({
      isActive,
      country: req.query.country as string | undefined,
      state: req.query.state as string | undefined,
      search: req.query.search as string | undefined,
    });

    return sendSuccess(res, configs, 'Shipping configurations retrieved successfully.');
  }

  /**
   * GET /api/v1/admin/shipping/configurations/:id
   * Retrieves a single shipping configuration by ID.
   */
  public async getConfigurationById(req: Request, res: Response): Promise<Response> {
    const config = await shippingService.getConfigurationById(req.params.id as string);
    return sendSuccess(res, config, 'Shipping configuration retrieved successfully.');
  }

  /**
   * POST /api/v1/admin/shipping/configurations
   * Creates a new shipping configuration.
   */
  public async createConfiguration(req: Request, res: Response): Promise<Response> {
    const actorId = req.user?.id;
    const actorRole = req.user?.role;

    const newConfig = await shippingService.createConfiguration(
      req.body as CreateShippingConfigDto,
      actorId,
      actorRole
    );

    return sendCreated(res, newConfig, 'Shipping configuration created successfully.');
  }

  /**
   * PATCH /api/v1/admin/shipping/configurations/:id
   * Updates an existing shipping configuration.
   */
  public async updateConfiguration(req: Request, res: Response): Promise<Response> {
    const actorId = req.user?.id;
    const actorRole = req.user?.role;

    const updated = await shippingService.updateConfiguration(
      req.params.id as string,
      req.body as UpdateShippingConfigDto,
      actorId,
      actorRole
    );

    return sendSuccess(res, updated, 'Shipping configuration updated successfully.');
  }

  /**
   * PATCH /api/v1/admin/shipping/configurations/:id/status
   * Toggles the active status of a shipping configuration.
   */
  public async toggleConfigurationStatus(req: Request, res: Response): Promise<Response> {
    const actorId = req.user?.id;
    const actorRole = req.user?.role;
    const { isActive } = req.body as { isActive: boolean };

    const updated = await shippingService.toggleConfigurationStatus(
      req.params.id as string,
      isActive,
      actorId,
      actorRole
    );

    return sendSuccess(
      res,
      updated,
      `Shipping configuration ${isActive ? 'activated' : 'deactivated'} successfully.`
    );
  }

  /**
   * DELETE /api/v1/admin/shipping/configurations/:id
   * Safely deletes a shipping configuration.
   */
  public async deleteConfiguration(req: Request, res: Response): Promise<Response> {
    const actorId = req.user?.id;
    const actorRole = req.user?.role;

    await shippingService.deleteConfiguration(req.params.id as string, actorId, actorRole);
    return sendNoContent(res);
  }
}

export const shippingController = new ShippingController();
