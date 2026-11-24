/**
 * Cartiva Mini — Customer Wishlist Controller
 * Handles HTTP requests for customer wishlist retrieval, bookmarking, removal,
 * and transferring items into the shopping cart.
 */
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import { wishlistService } from './wishlist.service.js';

export class WishlistController {
  /**
   * GET /api/v1/wishlist — Retrieve customer wishlist.
   */
  public getWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const wishlist = await wishlistService.getWishlist(userId);

    sendSuccess(res, wishlist, 'Wishlist retrieved successfully.', HttpStatus.OK);
  });

  /**
   * POST /api/v1/wishlist/items — Add a product to the wishlist.
   */
  public addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { productId } = req.body;

    const wishlist = await wishlistService.addItem(userId, productId);

    sendSuccess(res, wishlist, 'Product added to wishlist successfully.', HttpStatus.OK);
  });

  /**
   * DELETE /api/v1/wishlist/items/:itemId — Remove a product from the wishlist.
   */
  public removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const itemId = req.params.itemId as string;

    const wishlist = await wishlistService.removeItem(userId, itemId);

    sendSuccess(res, wishlist, 'Product removed from wishlist successfully.', HttpStatus.OK);
  });

  /**
   * POST /api/v1/wishlist/items/:itemId/move-to-cart — Move a wishlist item into the shopping cart.
   */
  public moveToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const itemId = req.params.itemId as string;

    const result = await wishlistService.moveItemToCart(userId, itemId, req.body);

    sendSuccess(res, result, 'Product moved to shopping cart successfully.', HttpStatus.OK);
  });
}

export const wishlistController = new WishlistController();
