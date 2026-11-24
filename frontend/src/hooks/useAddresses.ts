import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressService } from '../services/address.service.js';
import { useAuthStore } from '../stores/authStore.js';
import { USER_QUERY_KEYS } from './useUser.js';
import type { CreateAddressDto, UpdateAddressDto } from '@shared/api.types.js';

export const ADDRESS_QUERY_KEYS = {
  all: ['addresses'] as const,
};

export const useAddresses = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ADDRESS_QUERY_KEYS.all,
    queryFn: () => addressService.getAddresses(),
    enabled: isAuthenticated,
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAddressDto) => addressService.createAddress(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.dashboard });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, dto }: { addressId: string; dto: UpdateAddressDto }) =>
      addressService.updateAddress(addressId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => addressService.deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.dashboard });
    },
  });
};

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => addressService.setDefaultAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
};
