/**
 * Cartiva Mini — Cart & Wishlist Repository
 * Encapsulates Mongoose database operations for shopping carts and customer wishlists.
 */
import { Types } from 'mongoose';
import { Cart, type CartDocument } from '../../models/Cart.model.js';
import { Wishlist, type WishlistDocument } from '../../models/Wishlist.model.js';

export class CartRepository {
  /**
   * Finds a cart belonging to an authenticated user.
   */
  public async findCartByUserId(userId: string): Promise<CartDocument | null> {
    return Cart.findOne({ userId: new Types.ObjectId(userId) });
  }

  /**
   * Finds a guest cart by its secure session token.
   */
  public async findCartBySessionId(sessionId: string): Promise<CartDocument | null> {
    return Cart.findOne({ sessionId, userId: { $exists: false } });
  }

  /**
   * Finds a cart by MongoDB ID.
   */
  public async findCartById(cartId: string): Promise<CartDocument | null> {
    return Cart.findById(cartId);
  }

  /**
   * Creates a new cart document.
   */
  public async createCart(data: {
    userId?: Types.ObjectId;
    sessionId?: string;
    items?: unknown[];
    currency?: string;
    expiresAt?: Date;
  }): Promise<CartDocument> {
    return Cart.create(data);
  }

  /**
   * Deletes a cart by its ID.
   */
  public async deleteCartById(cartId: string): Promise<boolean> {
    const result = await Cart.deleteOne({ _id: new Types.ObjectId(cartId) });
    return result.deletedCount > 0;
  }

  /**
   * Deletes a guest cart by its session token.
   */
  public async deleteCartBySessionId(sessionId: string): Promise<boolean> {
    const result = await Cart.deleteOne({ sessionId });
    return result.deletedCount > 0;
  }

  /**
   * Saves a modified cart document.
   */
  public async saveCart(cart: CartDocument): Promise<CartDocument> {
    return cart.save();
  }

  // ==========================================================================
  // Wishlist Repository Operations
  // ==========================================================================

  /**
   * Finds a customer wishlist by user ID.
   */
  public async findWishlistByUserId(userId: string): Promise<WishlistDocument | null> {
    return Wishlist.findOne({ userId: new Types.ObjectId(userId) });
  }

  /**
   * Creates a new wishlist for a customer.
   */
  public async createWishlist(
    userId: string,
    items: Array<{ productId: Types.ObjectId }> = []
  ): Promise<WishlistDocument> {
    return Wishlist.create({
      userId: new Types.ObjectId(userId),
      items,
    });
  }

  /**
   * Saves a modified wishlist document.
   */
  public async saveWishlist(wishlist: WishlistDocument): Promise<WishlistDocument> {
    return wishlist.save();
  }
}

export const cartRepository = new CartRepository();
