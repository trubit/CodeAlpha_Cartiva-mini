import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventory.service.js';
import type {
  InitializeInventoryDto,
  ReceiveStockDto,
  DeductStockDto,
  AdjustStockDto,
  UpdateThresholdDto,
  CreateReservationDto,
} from '@shared/api.types.js';

export const INVENTORY_QUERY_KEYS = {
  all: ['inventory'] as const,
  list: (params?: Record<string, unknown>) =>
    [...INVENTORY_QUERY_KEYS.all, 'list', params] as const,
  summary: () => [...INVENTORY_QUERY_KEYS.all, 'summary'] as const,
  lowStock: (params?: Record<string, unknown>) =>
    [...INVENTORY_QUERY_KEYS.all, 'low-stock', params] as const,
  outOfStock: (params?: Record<string, unknown>) =>
    [...INVENTORY_QUERY_KEYS.all, 'out-of-stock', params] as const,
  detail: (id: string, variantId?: string) =>
    [...INVENTORY_QUERY_KEYS.all, 'detail', id, variantId] as const,
  movements: (params?: Record<string, unknown>) =>
    [...INVENTORY_QUERY_KEYS.all, 'movements', params] as const,
  targetMovements: (id: string, params?: Record<string, unknown>) =>
    [...INVENTORY_QUERY_KEYS.all, 'target-movements', id, params] as const,
  reservations: ['reservations'] as const,
  reservationDetail: (id: string) => [...INVENTORY_QUERY_KEYS.reservations, id] as const,
};

export const useInventoryList = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.list(params),
    queryFn: () => inventoryService.getInventoryList(params),
  });
};

export const useInventorySummary = () => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.summary(),
    queryFn: () => inventoryService.getInventorySummary(),
  });
};

export const useLowStockItems = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.lowStock(params),
    queryFn: () => inventoryService.getLowStockItems(params),
  });
};

export const useOutOfStockItems = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.outOfStock(params),
    queryFn: () => inventoryService.getOutOfStockItems(params),
  });
};

export const useInventoryDetail = (inventoryId: string, variantId?: string) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.detail(inventoryId, variantId),
    queryFn: () => inventoryService.getInventoryDetail(inventoryId, variantId),
    enabled: Boolean(inventoryId),
  });
};

export const useInventoryMovements = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.movements(params),
    queryFn: () => inventoryService.getMovements(params),
  });
};

export const useTargetInventoryMovements = (
  inventoryId: string,
  params?: Record<string, unknown>
) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.targetMovements(inventoryId, params),
    queryFn: () => inventoryService.getTargetMovements(inventoryId, params),
    enabled: Boolean(inventoryId),
  });
};

export const useInitializeStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
      variantId,
    }: {
      inventoryId: string;
      data: InitializeInventoryDto;
      variantId?: string;
    }) => inventoryService.initializeStock(inventoryId, data, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

export const useReceiveStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
      variantId,
    }: {
      inventoryId: string;
      data: ReceiveStockDto;
      variantId?: string;
    }) => inventoryService.receiveStock(inventoryId, data, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
      variantId,
    }: {
      inventoryId: string;
      data: AdjustStockDto;
      variantId?: string;
    }) => inventoryService.adjustStock(inventoryId, data, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

export const useDeductStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
      variantId,
    }: {
      inventoryId: string;
      data: DeductStockDto;
      variantId?: string;
    }) => inventoryService.deductStock(inventoryId, data, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

export const useUpdateThreshold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      data,
      variantId,
    }: {
      inventoryId: string;
      data: UpdateThresholdDto;
      variantId?: string;
    }) => inventoryService.updateThreshold(inventoryId, data, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

// Reservations
export const useReservation = (reservationId: string) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.reservationDetail(reservationId),
    queryFn: () => inventoryService.getReservation(reservationId),
    enabled: Boolean(reservationId),
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReservationDto) => inventoryService.createReservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
};

export const useReleaseReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => inventoryService.releaseReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.reservations });
    },
  });
};
