import type { Request, Response } from 'express';
import { inventoryService } from './inventory.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';

class InventoryController {
  /**
   * GET /api/v1/admin/inventory
   */
  public async getInventoryList(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getInventoryList(req.query);
    sendSuccess(
      res,
      result.items,
      'Inventory items retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  /**
   * GET /api/v1/admin/inventory/summary
   */
  public async getInventorySummary(_req: Request, res: Response): Promise<void> {
    const summary = await inventoryService.getInventorySummary();
    sendSuccess(res, summary, 'Inventory summary retrieved successfully.');
  }

  /**
   * GET /api/v1/admin/inventory/low-stock
   */
  public async getLowStock(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getLowStockItems(req.query);
    sendSuccess(
      res,
      result.items,
      'Low-stock inventory retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  /**
   * GET /api/v1/admin/inventory/out-of-stock
   */
  public async getOutOfStock(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getOutOfStockItems(req.query);
    sendSuccess(
      res,
      result.items,
      'Out-of-stock inventory retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  /**
   * GET /api/v1/admin/inventory/movements
   */
  public async getAllMovements(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getMovements(undefined, req.query);
    sendSuccess(
      res,
      result.movements,
      'Inventory movements retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  /**
   * GET /api/v1/admin/inventory/:inventoryId
   */
  public async getInventoryDetail(req: Request, res: Response): Promise<void> {
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const item = await inventoryService.getInventoryDetail(inventoryId, variantId);
    sendSuccess(res, item, 'Inventory item detail retrieved successfully.');
  }

  /**
   * GET /api/v1/admin/inventory/:inventoryId/movements
   */
  public async getInventoryMovements(req: Request, res: Response): Promise<void> {
    const inventoryId = req.params.inventoryId!;
    const result = await inventoryService.getMovements(inventoryId, req.query);
    sendSuccess(
      res,
      result.movements,
      'Target inventory movements retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  /**
   * POST /api/v1/admin/inventory/:inventoryId/initialize
   */
  public async initializeStock(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const updated = await inventoryService.initializeStock(
      adminId,
      inventoryId,
      req.body,
      variantId
    );
    sendSuccess(res, updated, 'Inventory stock initialized successfully.', HttpStatus.OK);
  }

  /**
   * POST /api/v1/admin/inventory/:inventoryId/receive
   */
  public async receiveStock(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const updated = await inventoryService.receiveStock(adminId, inventoryId, req.body, variantId);
    sendSuccess(res, updated, 'Stock received and logged successfully.', HttpStatus.OK);
  }

  /**
   * POST /api/v1/admin/inventory/:inventoryId/adjust
   */
  public async adjustStock(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const updated = await inventoryService.adjustStock(adminId, inventoryId, req.body, variantId);
    sendSuccess(res, updated, 'Stock adjusted and logged successfully.', HttpStatus.OK);
  }

  /**
   * POST /api/v1/admin/inventory/:inventoryId/deduct
   */
  public async deductStock(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const updated = await inventoryService.deductStock(adminId, inventoryId, req.body, variantId);
    sendSuccess(res, updated, 'Stock deducted and logged successfully.', HttpStatus.OK);
  }

  /**
   * PATCH /api/v1/admin/inventory/:inventoryId/threshold
   */
  public async updateThreshold(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const inventoryId = req.params.inventoryId!;
    const variantId = req.query.variantId as string | undefined;
    const updated = await inventoryService.updateThreshold(
      adminId,
      inventoryId,
      req.body,
      variantId
    );
    sendSuccess(res, updated, 'Low-stock threshold updated successfully.', HttpStatus.OK);
  }

  // ==========================================================================
  // Reservations Foundation
  // ==========================================================================

  /**
   * POST /api/v1/inventory/reservations
   */
  public async createReservation(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const sessionId = (req.headers['x-session-id'] as string) || undefined;
    const reservation = await inventoryService.createReservation({
      ...req.body,
      userId,
      sessionId,
    });
    sendCreated(res, reservation, 'Stock reserved successfully.');
  }

  /**
   * GET /api/v1/inventory/reservations/:reservationId
   */
  public async getReservation(req: Request, res: Response): Promise<void> {
    const reservationId = req.params.reservationId!;
    const reservation = await inventoryService.getReservation(reservationId);
    sendSuccess(res, reservation, 'Reservation details retrieved successfully.');
  }

  /**
   * POST /api/v1/inventory/reservations/:reservationId/release
   */
  public async releaseReservation(req: Request, res: Response): Promise<void> {
    const reservationId = req.params.reservationId!;
    const reservation = await inventoryService.releaseReservation(reservationId);
    sendSuccess(res, reservation, 'Reservation released successfully.');
  }
}

export const inventoryController = new InventoryController();
