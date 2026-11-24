import { apiClient } from './api.js';
import type {
  ApiResponse,
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '@shared/api.types.js';

export const addressService = {
  /**
   * Fetches all delivery addresses for the authenticated customer.
   */
  async getAddresses(): Promise<AddressDto[]> {
    const res = await apiClient.get<ApiResponse<AddressDto[]>>('/users/me/addresses');
    return res.data.data;
  },

  /**
   * Adds a new delivery address.
   */
  async createAddress(dto: CreateAddressDto): Promise<AddressDto> {
    const res = await apiClient.post<ApiResponse<AddressDto>>('/users/me/addresses', dto);
    return res.data.data;
  },

  /**
   * Updates an existing delivery address.
   */
  async updateAddress(addressId: string, dto: UpdateAddressDto): Promise<AddressDto> {
    const res = await apiClient.patch<ApiResponse<AddressDto>>(
      `/users/me/addresses/${addressId}`,
      dto
    );
    return res.data.data;
  },

  /**
   * Deletes a delivery address.
   */
  async deleteAddress(addressId: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/users/me/addresses/${addressId}`);
  },

  /**
   * Sets an address as the default delivery address.
   */
  async setDefaultAddress(addressId: string): Promise<AddressDto> {
    const res = await apiClient.patch<ApiResponse<AddressDto>>(
      `/users/me/addresses/${addressId}/default`
    );
    return res.data.data;
  },
};
