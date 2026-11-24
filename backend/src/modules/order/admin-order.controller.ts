/**
 * Cartiva Mini — Administrator Order Controller
 * Handles administrative order inspection, multi-criteria filtering, status transitions, and audit logs.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { orderService } from './order.service.js';
import { orderAdminFilterSchema, updateOrderStatusSchema } from './order.validator.js';

export class AdminOrderController {
  /**
   * GET /api/v1/admin/orders
   * Retrieves paginated orders matching search/filter criteria.
   */
  public listOrders = asyncHandler(async (req: Request, res: Response) => {
    const filter = orderAdminFilterSchema.parse(req.query);
    const { orders, meta } = await orderService.getAdminOrders(filter);
    return sendSuccess(res, orders, 'Orders retrieved successfully.', 200, meta);
  });

  /**
   * GET /api/v1/admin/orders/:orderId
   * Retrieves complete order detail for administrator view.
   */
  public getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string;
    const order = await orderService.getAdminOrderDetail(orderId);
    return sendSuccess(res, order, 'Order detail retrieved successfully.');
  });

  /**
   * PATCH /api/v1/admin/orders/:orderId/status
   * Transitions order status with validation and audit trail.
   */
  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const adminUserId = req.user!.id;
    const orderId = req.params.orderId as string;
    const validated = updateOrderStatusSchema.parse(req.body);
    const updatedOrder = await orderService.updateAdminOrderStatus(adminUserId, orderId, validated);
    return sendSuccess(res, updatedOrder, 'Order status updated successfully.');
  });

  /**
   * GET /api/v1/admin/orders/:orderId/audit
   * Retrieves chronological audit entries for an order.
   */
  public getOrderAudit = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string;
    const auditEntries = await orderService.getOrderAuditHistory(orderId);
    return sendSuccess(res, auditEntries, 'Order audit history retrieved successfully.');
  });
}

export const adminOrderController = new AdminOrderController();
