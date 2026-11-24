/**
 * Cartiva Mini — Checkout Controller
 * Handles customer checkout sessions, address and shipping selection, pre-flight validation, and order confirmation.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { checkoutService } from './checkout.service.js';
import {
  checkoutSetAddressSchema,
  checkoutSetShippingSchema,
  checkoutConfirmSchema,
} from './checkout.validator.js';

export class CheckoutController {
  /**
   * GET /api/v1/checkout/session
   * Retrieves or initializes active checkout session for authenticated customer.
   */
  public getSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await checkoutService.getOrCreateSession(userId);
    return sendSuccess(res, session, 'Checkout session retrieved successfully.');
  });

  /**
   * PATCH /api/v1/checkout/session/address
   * Sets delivery destination address for the checkout session.
   */
  public setAddress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = checkoutSetAddressSchema.parse(req.body);
    const session = await checkoutService.setDeliveryAddress(userId, validated.addressId);
    return sendSuccess(res, session, 'Delivery address selected successfully.');
  });

  /**
   * PATCH /api/v1/checkout/session/shipping
   * Selects shipping method and authoritatively computes shipping fee.
   */
  public setShipping = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = checkoutSetShippingSchema.parse(req.body);
    const session = await checkoutService.setShippingMethod(userId, validated.shippingMethodId);
    return sendSuccess(res, session, 'Shipping method selected successfully.');
  });

  /**
   * GET /api/v1/checkout/session/summary
   * Retrieves comprehensive server-side checkout summary.
   */
  public getSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const summary = await checkoutService.getSessionSummary(userId);
    return sendSuccess(res, summary, 'Checkout summary retrieved successfully.');
  });

  /**
   * POST /api/v1/checkout/validate
   * Runs pre-flight checkout validation without modifying state.
   */
  public validateCheckout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validation = await checkoutService.validateCheckout(userId);
    return sendSuccess(res, validation, 'Checkout pre-flight validation completed.');
  });

  /**
   * POST /api/v1/checkout/confirm
   * Authoritative order creation with atomic inventory reservation.
   */
  public confirmOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = checkoutConfirmSchema.parse(req.body);
    const confirmation = await checkoutService.confirmOrder(userId, validated);
    return sendCreated(res, confirmation, 'Order created successfully. Pending payment.');
  });
}

export const checkoutController = new CheckoutController();
