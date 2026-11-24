import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingService } from '../services/shipping.service.js';
import type {
  ShippingQuoteRequestDto,
  CreateShippingConfigDto,
  UpdateShippingConfigDto,
  ShippingConfigFilterDto,
} from '@shared/api.types.js';

export const SHIPPING_QUERY_KEYS = {
  methods: (country: string, state: string) => ['shipping', 'methods', country, state] as const,
  availability: (country: string, state: string) =>
    ['shipping', 'availability', country, state] as const,
  adminConfigurations: (filters?: ShippingConfigFilterDto) =>
    ['admin', 'shipping', 'configurations', filters] as const,
  adminConfigurationDetail: (id: string) => ['admin', 'shipping', 'configuration', id] as const,
};

/**
 * Hook to retrieve available shipping methods for a specific location.
 */
export const useShippingMethods = (country = 'Nigeria', state?: string) => {
  return useQuery({
    queryKey: SHIPPING_QUERY_KEYS.methods(country, state || ''),
    queryFn: () => shippingService.getShippingMethods(country, state!),
    enabled: Boolean(state && state.trim().length > 0),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

/**
 * Hook to check delivery availability for a location.
 */
export const useShippingAvailability = (country = 'Nigeria', state?: string) => {
  return useQuery({
    queryKey: SHIPPING_QUERY_KEYS.availability(country, state || ''),
    queryFn: () => shippingService.checkAvailability(country, state!),
    enabled: Boolean(state && state.trim().length > 0),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Mutation hook to calculate authoritative shipping quotes.
 */
export const useCalculateShippingQuote = () => {
  return useMutation({
    mutationFn: (dto: ShippingQuoteRequestDto) => shippingService.calculateQuote(dto),
  });
};

// ============================================================================
// Administrator Hooks
// ============================================================================

/**
 * Hook to list all shipping configurations for admin management.
 */
export const useAdminShippingConfigurations = (filters?: ShippingConfigFilterDto) => {
  return useQuery({
    queryKey: SHIPPING_QUERY_KEYS.adminConfigurations(filters),
    queryFn: () => shippingService.getAdminConfigurations(filters),
  });
};

/**
 * Hook to fetch a single shipping configuration by ID for editing.
 */
export const useAdminShippingConfigurationDetail = (id?: string) => {
  return useQuery({
    queryKey: SHIPPING_QUERY_KEYS.adminConfigurationDetail(id || ''),
    queryFn: () => shippingService.getAdminConfigurationById(id!),
    enabled: Boolean(id),
  });
};

/**
 * Mutation hook to create a new shipping configuration.
 */
export const useCreateShippingConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateShippingConfigDto) => shippingService.createAdminConfiguration(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });
};

/**
 * Mutation hook to update an existing shipping configuration.
 */
export const useUpdateShippingConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateShippingConfigDto }) =>
      shippingService.updateAdminConfiguration(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });
};

/**
 * Mutation hook to toggle active status of a shipping configuration.
 */
export const useToggleShippingConfigStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      shippingService.toggleAdminConfigurationStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });
};

/**
 * Mutation hook to delete a shipping configuration.
 */
export const useDeleteShippingConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shippingService.deleteAdminConfiguration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });
};
