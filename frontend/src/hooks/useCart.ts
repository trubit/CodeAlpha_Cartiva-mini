/**
 * Cartiva Mini — Shopping Cart TanStack Query Hooks
 * Manages cart server state, mutations, optimistic updates, and invalidations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service';
import type { AddCartItemDto, UpdateCartItemQuantityDto, MergeCartDto } from '@shared/api.types.js';

export const CART_QUERY_KEYS = {
  cart: ['cart'] as const,
};

/**
 * Hook to retrieve the current shopping cart.
 */
export const useCart = () => {
  return useQuery({
    queryKey: CART_QUERY_KEYS.cart,
    queryFn: () => cartService.getCart(),
    staleTime: 30 * 1000,
  });
};

/**
 * Mutation hook to add an item or variant to the shopping cart.
 */
export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCartItemDto) => cartService.addItem(data),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to update an item's quantity.
 */
export const useUpdateCartQuantity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateCartItemQuantityDto }) =>
      cartService.updateQuantity(itemId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to remove an individual item from the cart.
 */
export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to empty the entire cart.
 */
export const useClearCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, response);
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};

/**
 * Mutation hook to merge a guest cart into the customer cart.
 */
export const useMergeCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: MergeCartDto) => cartService.mergeCart(data),
    onSuccess: (response) => {
      queryClient.setQueryData(CART_QUERY_KEYS.cart, {
        success: response.success,
        message: response.message,
        data: response.data.cart,
      });
      void queryClient.invalidateQueries({ queryKey: ['user', 'dashboard'] });
    },
  });
};
