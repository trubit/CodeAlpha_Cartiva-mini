/**
 * Cartiva Mini — Customer Wishlist TanStack Query Hooks
 * Manages customer wishlist server state, mutations, and cache invalidation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '../services/wishlist.service';
import { CART_QUERY_KEYS } from './useCart';
import type { AddWishlistItemDto, MoveWishlistItemToCartDto } from '@shared/api.types.js';

export const WISHLIST_QUERY_KEYS = {
  wishlist: ['wishlist'] as const,
};

/**
 * Hook to retrieve the authenticated customer's wishlist.
 */
export const useWishlist = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEYS.wishlist,
    queryFn: () => wishlistService.getWishlist(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60 * 1000,
  });
};

/**
 * Mutation hook to add a product to the customer's wishlist.
 */
export const useAddToWishlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddWishlistItemDto) => wishlistService.addItem(data),
    onSuccess: (response) => {
      queryClient.setQueryData(WISHLIST_QUERY_KEYS.wishlist, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to remove a product from the customer's wishlist.
 */
export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => wishlistService.removeItem(itemId),
    onSuccess: (response) => {
      queryClient.setQueryData(WISHLIST_QUERY_KEYS.wishlist, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to move a wishlisted item directly into the shopping cart.
 */
export const useMoveWishlistToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data?: MoveWishlistItemToCartDto }) =>
      wishlistService.moveToCart(itemId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, {
        success: response.success,
        message: response.message,
        data: response.data.cart,
      });
      queryClient.setQueryData(WISHLIST_QUERY_KEYS.wishlist, {
        success: response.success,
        message: response.message,
        data: response.data.wishlist,
      });
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};
