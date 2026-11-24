/**
 * Cartiva Mini — Frontend Wishlist API Service
 * Handles communication with customer wishlist endpoints.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  WishlistDto,
  AddWishlistItemDto,
  MoveWishlistItemToCartDto,
  CartDto,
} from '@shared/api.types.js';

export const wishlistService = {
  /**
   * Retrieves customer wishlist.
   */
  async getWishlist(): Promise<ApiResponse<WishlistDto>> {
    const response = await apiClient.get<ApiResponse<WishlistDto>>('/wishlist');
    return response.data;
  },

  /**
   * Adds a product to customer wishlist.
   */
  async addItem(data: AddWishlistItemDto): Promise<ApiResponse<WishlistDto>> {
    const response = await apiClient.post<ApiResponse<WishlistDto>>('/wishlist/items', data);
    return response.data;
  },

  /**
   * Removes an item from the customer wishlist.
   */
  async removeItem(itemId: string): Promise<ApiResponse<WishlistDto>> {
    const response = await apiClient.delete<ApiResponse<WishlistDto>>(`/wishlist/items/${itemId}`);
    return response.data;
  },

  /**
   * Moves a wishlisted item into the customer's shopping cart.
   */
  async moveToCart(
    itemId: string,
    data?: MoveWishlistItemToCartDto
  ): Promise<ApiResponse<{ cart: CartDto; wishlist: WishlistDto }>> {
    const response = await apiClient.post<ApiResponse<{ cart: CartDto; wishlist: WishlistDto }>>(
      `/wishlist/items/${itemId}/move-to-cart`,
      data || {}
    );
    return response.data;
  },
};
