/**
 * Cartiva Mini — Shopping Cart Controller
 * Handles HTTP requests for cart retrieval, additions, updates, deletions, and merging.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import { cartService, type CartContext } from './cart.service.js';
import {
  CART_CONSTANTS,
  GUEST_CART_COOKIE_OPTIONS,
  CLEAR_GUEST_CART_COOKIE_OPTIONS,
} from './cart.constants.js';

export class CartController {
  /**
   * Helper to extract cart context (authenticated user ID and/or guest token).
   */
  private extractContext(req: Request): CartContext {
    const userId = req.user?.id;
    const guestToken =
      (req.headers[CART_CONSTANTS.GUEST_CART_HEADER] as string) ||
      (req.headers[CART_CONSTANTS.GUEST_CART_ALT_HEADER] as string) ||
      (req.cookies?.[CART_CONSTANTS.GUEST_CART_COOKIE_NAME] as string) ||
      undefined;

    return { userId, guestToken };
  }

  /**
   * Helper to apply guest token to response headers and cookies.
   */
  private applyGuestToken(res: Response, guestToken?: string): void {
    if (guestToken) {
      res.setHeader(CART_CONSTANTS.GUEST_CART_HEADER, guestToken);
      res.cookie(CART_CONSTANTS.GUEST_CART_COOKIE_NAME, guestToken, GUEST_CART_COOKIE_OPTIONS);
    }
  }

  /**
   * GET /api/v1/cart — Retrieve the current shopping cart.
   */
  public getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const context = this.extractContext(req);
    const { cart, guestToken } = await cartService.getCart(context);
    this.applyGuestToken(res, guestToken);

    sendSuccess(res, cart, 'Shopping cart retrieved successfully.', HttpStatus.OK);
  });

  /**
   * POST /api/v1/cart/items — Add an item to the shopping cart.
   */
  public addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const context = this.extractContext(req);
    const { cart, guestToken } = await cartService.addItem(context, req.body);
    this.applyGuestToken(res, guestToken);

    sendSuccess(res, cart, 'Item added to cart successfully.', HttpStatus.OK);
  });

  /**
   * PATCH /api/v1/cart/items/:itemId — Update item quantity in the cart.
   */
  public updateItemQuantity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const context = this.extractContext(req);
    const itemId = req.params.itemId as string;
    const { quantity } = req.body;

    const { cart, guestToken } = await cartService.updateItemQuantity(context, itemId, quantity);
    this.applyGuestToken(res, guestToken);

    sendSuccess(res, cart, 'Cart item quantity updated successfully.', HttpStatus.OK);
  });

  /**
   * DELETE /api/v1/cart/items/:itemId — Remove an individual item from the cart.
   */
  public removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const context = this.extractContext(req);
    const itemId = req.params.itemId as string;

    const { cart, guestToken } = await cartService.removeItem(context, itemId);
    this.applyGuestToken(res, guestToken);

    sendSuccess(res, cart, 'Item removed from cart successfully.', HttpStatus.OK);
  });

  /**
   * DELETE /api/v1/cart — Clear all items from the shopping cart.
   */
  public clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const context = this.extractContext(req);
    const { cart, guestToken } = await cartService.clearCart(context);
    this.applyGuestToken(res, guestToken);

    sendSuccess(res, cart, 'Shopping cart cleared successfully.', HttpStatus.OK);
  });

  /**
   * POST /api/v1/cart/merge — Merge guest cart into authenticated customer cart.
   */
  public mergeCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const guestToken =
      req.body?.guestCartToken ||
      (req.headers[CART_CONSTANTS.GUEST_CART_HEADER] as string) ||
      (req.headers[CART_CONSTANTS.GUEST_CART_ALT_HEADER] as string) ||
      (req.cookies?.[CART_CONSTANTS.GUEST_CART_COOKIE_NAME] as string);

    const result = await cartService.mergeGuestCart(userId, guestToken);

    // Clear guest cart cookie upon merge
    res.clearCookie(CART_CONSTANTS.GUEST_CART_COOKIE_NAME, CLEAR_GUEST_CART_COOKIE_OPTIONS);

    sendSuccess(res, result, 'Guest cart merged successfully.', HttpStatus.OK);
  });
}

export const cartController = new CartController();
