/**
 * Cartiva Mini — Customer Order Controller
 * Handles customer order history, detail retrieval, and order cancellation.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { orderService } from './order.service.js';
import { cancelOrderSchema, orderCustomerFilterSchema } from './order.validator.js';

export class OrderController {
  /**
   * GET /api/v1/orders
   * Retrieves paginated order history for the authenticated customer.
   */
  public getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const query = orderCustomerFilterSchema.parse(req.query);
    const { orders, meta } = await orderService.getCustomerOrders(userId, query.page, query.limit);
    return sendSuccess(res, orders, 'Orders retrieved successfully.', 200, meta);
  });

  /**
   * GET /api/v1/orders/:orderId
   * Retrieves detailed order snapshot for the authenticated customer.
   */
  public getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const order = await orderService.getCustomerOrderDetail(userId, orderId);
    return sendSuccess(res, order, 'Order details retrieved successfully.');
  });

  /**
   * POST /api/v1/orders/:orderId/cancel
   * Cancels eligible order and releases reserved inventory.
   */
  public cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const validated = cancelOrderSchema.parse(req.body);
    const cancelledOrder = await orderService.cancelCustomerOrder(
      userId,
      orderId,
      validated.reason
    );
    return sendSuccess(res, cancelledOrder, 'Order cancelled successfully.');
  });
}

export const orderController = new OrderController();
