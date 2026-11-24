/**
 * Cartiva Mini — Fulfilment TanStack Query Hooks
 * Manages server state for order tracking, administrative fulfilment lists,
 * shipment creation, event timeline updates, delivery confirmation, and exceptions.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fulfilmentService } from '@/services/fulfilment.service';
import type {
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
  DeliveryConfirmationDto,
  DeliveryExceptionDto,
  UpdateFulfilmentStatusDto,
  FulfilmentFilterDto,
} from '@shared/api.types';

export const FULFILMENT_KEYS = {
  all: ['fulfilment'] as const,
  tracking: (orderId: string) => [...FULFILMENT_KEYS.all, 'tracking', orderId] as const,
  adminList: (filter?: FulfilmentFilterDto) => [...FULFILMENT_KEYS.all, 'admin-list', filter] as const,
  adminDetail: (orderId: string) => [...FULFILMENT_KEYS.all, 'admin-detail', orderId] as const,
};

/**
 * Customer hook: Retrieves live delivery tracking timeline for an order.
 */
export const useCustomerTracking = (
  orderId: string,
  enabled = true,
  refetchInterval: number | false = false
) => {
  return useQuery({
    queryKey: FULFILMENT_KEYS.tracking(orderId),
    queryFn: () => fulfilmentService.getCustomerTracking(orderId),
    enabled: Boolean(orderId) && enabled,
    refetchInterval,
  });
};

/**
 * Admin hook: Retrieves paginated orders eligible for or currently in fulfilment.
 */
export const useAdminFulfilmentOrders = (filter: FulfilmentFilterDto = {}, enabled = true) => {
  return useQuery({
    queryKey: FULFILMENT_KEYS.adminList(filter),
    queryFn: () => fulfilmentService.getAdminFulfilmentOrders(filter),
    enabled,
  });
};

/**
 * Admin hook: Retrieves full fulfilment detail and shipment timeline for an order.
 */
export const useAdminFulfilmentOrderDetail = (orderId: string, enabled = true) => {
  return useQuery({
    queryKey: FULFILMENT_KEYS.adminDetail(orderId),
    queryFn: () => fulfilmentService.getAdminFulfilmentOrderDetail(orderId),
    enabled: Boolean(orderId) && enabled,
  });
};

/**
 * Admin mutation: Advance order fulfilment status.
 */
export const useUpdateFulfilmentStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: UpdateFulfilmentStatusDto }) =>
      fulfilmentService.updateAdminFulfilmentStatus(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};

/**
 * Admin mutation: Create shipment for paid order.
 */
export const useCreateShipmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: CreateShipmentDto }) =>
      fulfilmentService.createAdminShipment(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};

/**
 * Admin mutation: Update shipment attributes.
 */
export const useUpdateShipmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, data }: { shipmentId: string; data: UpdateShipmentDto }) =>
      fulfilmentService.updateAdminShipment(shipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};

/**
 * Admin mutation: Append tracking event.
 */
export const useAddTrackingEventMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, data }: { shipmentId: string; data: AddTrackingEventDto }) =>
      fulfilmentService.addAdminTrackingEvent(shipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};

/**
 * Admin mutation: Confirm final delivery.
 */
export const useConfirmDeliveryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, data }: { shipmentId: string; data: DeliveryConfirmationDto }) =>
      fulfilmentService.confirmAdminDelivery(shipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};

/**
 * Admin mutation: Record delivery exception.
 */
export const useRecordDeliveryExceptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, data }: { shipmentId: string; data: DeliveryExceptionDto }) =>
      fulfilmentService.recordAdminDeliveryException(shipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FULFILMENT_KEYS.all });
    },
  });
};
