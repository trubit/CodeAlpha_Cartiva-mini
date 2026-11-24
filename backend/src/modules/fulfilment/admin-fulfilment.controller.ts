/**
 * Cartiva Mini — Administrator Fulfilment Controller
 * Manages order processing, packaging, shipment creation, tracking events,
 * delivery confirmations, and exceptions.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import type { FulfilmentFilterDto } from '@shared/api.types.js';
import { fulfilmentService } from './fulfilment.service.js';
import {
  createShipmentSchema,
  updateShipmentSchema,
  addTrackingEventSchema,
  deliveryConfirmationSchema,
  deliveryExceptionSchema,
  updateFulfilmentStatusSchema,
  fulfilmentFilterSchema,
} from './fulfilment.validator.js';

export class AdminFulfilmentController {
  /**
   * GET /api/v1/admin/fulfilment
   * Lists orders eligible for or currently in fulfilment with status/search filtering.
   */
  public listOrders = asyncHandler(async (req: Request, res: Response) => {
    const filter = fulfilmentFilterSchema.parse(req.query) as unknown as FulfilmentFilterDto;
    const { orders, meta } = await fulfilmentService.getFulfilmentOrders(filter);
    return sendSuccess(res, orders, 'Fulfilment orders retrieved successfully.', 200, meta);
  });

  /**
   * GET /api/v1/admin/fulfilment/:orderId
   * Retrieves complete fulfilment details and shipment timeline for an order.
   */
  public getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string;
    const detail = await fulfilmentService.getFulfilmentOrderDetail(orderId);
    return sendSuccess(res, detail, 'Order fulfilment detail retrieved successfully.');
  });

  /**
   * PATCH /api/v1/admin/fulfilment/:orderId/status
   * Advances order fulfilment status through the state machine.
   */
  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const orderId = req.params.orderId as string;
    const body = updateFulfilmentStatusSchema.parse(req.body);
    const updated = await fulfilmentService.updateFulfilmentStatus(staff, orderId, body);
    return sendSuccess(res, updated, 'Order fulfilment status updated successfully.');
  });

  /**
   * POST /api/v1/admin/fulfilment/:orderId/shipments
   * Creates a formal shipment record for an eligible paid order.
   */
  public createShipment = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const orderId = req.params.orderId as string;
    const body = createShipmentSchema.parse(req.body);
    const result = await fulfilmentService.createShipment(staff, orderId, body);
    return sendSuccess(res, result, 'Shipment created successfully.', 201);
  });

  /**
   * PATCH /api/v1/admin/shipments/:shipmentId
   * Updates shipment details (carrier, tracking URL, notes).
   */
  public updateShipment = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const shipmentId = req.params.shipmentId as string;
    const body = updateShipmentSchema.parse(req.body);
    const updated = await fulfilmentService.updateShipment(staff, shipmentId, body);
    return sendSuccess(res, updated, 'Shipment updated successfully.');
  });

  /**
   * POST /api/v1/admin/shipments/:shipmentId/events
   * Appends an immutable tracking event to the shipment timeline.
   */
  public addTrackingEvent = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const shipmentId = req.params.shipmentId as string;
    const body = addTrackingEventSchema.parse(req.body);
    const updated = await fulfilmentService.addTrackingEvent(staff, shipmentId, body);
    return sendSuccess(res, updated, 'Tracking event recorded successfully.', 201);
  });

  /**
   * POST /api/v1/admin/shipments/:shipmentId/delivery-confirmation
   * Confirms final delivery with recipient, timestamp, and audit trail.
   */
  public confirmDelivery = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const shipmentId = req.params.shipmentId as string;
    const body = deliveryConfirmationSchema.parse(req.body);
    const updated = await fulfilmentService.confirmDelivery(staff, shipmentId, body);
    return sendSuccess(res, updated, 'Delivery confirmation recorded successfully.');
  });

  /**
   * POST /api/v1/admin/shipments/:shipmentId/exceptions
   * Records a delivery exception (customer unavailable, incorrect address, delay).
   */
  public recordException = asyncHandler(async (req: Request, res: Response) => {
    const staff = req.user!;
    const shipmentId = req.params.shipmentId as string;
    const body = deliveryExceptionSchema.parse(req.body);
    const updated = await fulfilmentService.recordDeliveryException(staff, shipmentId, body);
    return sendSuccess(res, updated, 'Delivery exception recorded successfully.');
  });
}

export const adminFulfilmentController = new AdminFulfilmentController();
