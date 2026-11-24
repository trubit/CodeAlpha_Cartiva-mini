/**
 * Cartiva Mini — Frontend Shopping Cart API Service
 * Handles communication with the backend cart REST endpoints using axios.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  CartDto,
  AddCartItemDto,
  UpdateCartItemQuantityDto,
  MergeCartDto,
  CartMergeResponseDto,
} from '@shared/api.types.js';

export const cartService = {
  /**
   * Retrieves the current shopping cart.
   */
  async getCart(): Promise<ApiResponse<CartDto>> {
    const response = await apiClient.get<ApiResponse<CartDto>>('/cart');
    return response.data;
  },

  /**
   * Adds an item to the shopping cart.
   */
  async addItem(data: AddCartItemDto): Promise<ApiResponse<CartDto>> {
    const response = await apiClient.post<ApiResponse<CartDto>>('/cart/items', data);
    return response.data;
  },

  /**
   * Updates an item's quantity in the shopping cart.
   */
  async updateQuantity(
    itemId: string,
    data: UpdateCartItemQuantityDto
  ): Promise<ApiResponse<CartDto>> {
    const response = await apiClient.patch<ApiResponse<CartDto>>(`/cart/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Removes an individual item from the shopping cart.
   */
  async removeItem(itemId: string): Promise<ApiResponse<CartDto>> {
    const response = await apiClient.delete<ApiResponse<CartDto>>(`/cart/items/${itemId}`);
    return response.data;
  },

  /**
   * Clears the entire shopping cart.
   */
  async clearCart(): Promise<ApiResponse<CartDto>> {
    const response = await apiClient.delete<ApiResponse<CartDto>>('/cart');
    return response.data;
  },

  /**
   * Merges a guest cart into the authenticated customer's cart.
   */
  async mergeCart(data?: MergeCartDto): Promise<ApiResponse<CartMergeResponseDto>> {
    const response = await apiClient.post<ApiResponse<CartMergeResponseDto>>(
      '/cart/merge',
      data || {}
    );
    return response.data;
  },
};
