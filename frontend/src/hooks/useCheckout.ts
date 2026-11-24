/**
 * Cartiva Mini — Checkout TanStack Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkout.service';
import { useAuthStore } from '@/stores/authStore';
import type { CheckoutConfirmRequestDto } from '@shared/api.types';

export const CHECKOUT_KEYS = {
  all: ['checkout'] as const,
  session: () => [...CHECKOUT_KEYS.all, 'session'] as const,
  summary: () => [...CHECKOUT_KEYS.all, 'summary'] as const,
};

export const useCheckoutSession = (enabled = true) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  return useQuery({
    queryKey: CHECKOUT_KEYS.session(),
    queryFn: () => checkoutService.getSession(),
    enabled: Boolean(enabled) && isAuthenticated && Boolean(accessToken),
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
  });
};

export const useCheckoutSummary = (enabled = true) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  return useQuery({
    queryKey: CHECKOUT_KEYS.summary(),
    queryFn: () => checkoutService.getSummary(),
    enabled: enabled && isAuthenticated && Boolean(accessToken),
    staleTime: 1000 * 15,
  });
};

export const useSetCheckoutAddressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => checkoutService.setAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECKOUT_KEYS.all });
    },
  });
};

export const useSetCheckoutShippingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shippingMethodId: string) => checkoutService.setShipping(shippingMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECKOUT_KEYS.all });
    },
  });
};

export const useConfirmOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckoutConfirmRequestDto) => checkoutService.confirmOrder(data),
    onSuccess: () => {
      // Invalidate cart, checkout, and orders queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: CHECKOUT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
