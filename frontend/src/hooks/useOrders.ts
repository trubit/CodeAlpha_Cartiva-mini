/**
 * Cartiva Mini — Order TanStack Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';
import type { OrderAdminFilterDto, UpdateOrderStatusDto } from '@shared/api.types';

export const ORDER_KEYS = {
  all: ['orders'] as const,
  customerList: (page?: number, limit?: number) =>
    [...ORDER_KEYS.all, 'customer', { page, limit }] as const,
  customerDetail: (id: string) => [...ORDER_KEYS.all, 'detail', id] as const,
  adminList: (filter: OrderAdminFilterDto) => [...ORDER_KEYS.all, 'admin', filter] as const,
  adminDetail: (id: string) => [...ORDER_KEYS.all, 'admin-detail', id] as const,
  adminAudit: (id: string) => [...ORDER_KEYS.all, 'audit', id] as const,
};

export const useMyOrders = (page = 1, limit = 10, enabled = true) => {
  return useQuery({
    queryKey: ORDER_KEYS.customerList(page, limit),
    queryFn: () => orderService.getMyOrders(page, limit),
    enabled,
    staleTime: 1000 * 60,
  });
};

export const useOrderDetail = (identifier: string, enabled = true) => {
  return useQuery({
    queryKey: ORDER_KEYS.customerDetail(identifier),
    queryFn: () => orderService.getOrderDetail(identifier),
    enabled: Boolean(identifier) && enabled,
  });
};

export const useCancelOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, reason }: { identifier: string; reason?: string }) =>
      orderService.cancelOrder(identifier, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
  });
};

export const useAdminOrders = (filter: OrderAdminFilterDto = {}, enabled = true) => {
  return useQuery({
    queryKey: ORDER_KEYS.adminList(filter),
    queryFn: () => orderService.getAdminOrders(filter),
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useAdminOrderDetail = (identifier: string, enabled = true) => {
  return useQuery({
    queryKey: ORDER_KEYS.adminDetail(identifier),
    queryFn: () => orderService.getAdminOrderDetail(identifier),
    enabled: Boolean(identifier) && enabled,
  });
};

export const useUpdateAdminOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, data }: { identifier: string; data: UpdateOrderStatusDto }) =>
      orderService.updateAdminOrderStatus(identifier, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
  });
};

export const useAdminOrderAudit = (identifier: string, enabled = true) => {
  return useQuery({
    queryKey: ORDER_KEYS.adminAudit(identifier),
    queryFn: () => orderService.getAdminOrderAudit(identifier),
    enabled: Boolean(identifier) && enabled,
  });
};
