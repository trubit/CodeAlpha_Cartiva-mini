/**
 * Cartiva Mini — Customer Fulfilment & Delivery Tracking Controller
 * Endpoints for customers to track delivery progress of their orders.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { fulfilmentService } from './fulfilment.service.js';

export class CustomerFulfilmentController {
  /**
   * GET /api/v1/orders/:orderId/fulfilment
   * Retrieves fulfilment status and shipment summary for customer's own order.
   */
  public getOrderFulfilment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const tracking = await fulfilmentService.getCustomerTracking(userId, orderId);
    return sendSuccess(res, tracking, 'Order fulfilment information retrieved successfully.');
  });

  /**
   * GET /api/v1/orders/:orderId/tracking
   * Retrieves complete delivery tracking event timeline for customer's own order.
   */
  public getOrderTracking = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const tracking = await fulfilmentService.getCustomerTracking(userId, orderId);
    return sendSuccess(res, tracking, 'Delivery tracking timeline retrieved successfully.');
  });
}

export const customerFulfilmentController = new CustomerFulfilmentController();
