import { apiClient } from './api.js';
import type {
  ApiResponse,
  SafeUser,
  UpdateProfileDto,
  CustomerDashboardSummaryDto,
  RequestEmailChangeDto,
  VerifyEmailChangeDto,
  DeactivationRequestDto,
  DeletionRequestDto,
  DeletionStatusDto,
} from '@shared/api.types.js';

export const userService = {
  /**
   * Retrieves the current authenticated customer's profile.
   */
  async getProfile(): Promise<SafeUser> {
    const res = await apiClient.get<ApiResponse<SafeUser>>('/users/me');
    return res.data.data;
  },

  /**
   * Updates basic profile attributes (firstName, lastName, phone).
   */
  async updateProfile(dto: UpdateProfileDto): Promise<SafeUser> {
    const res = await apiClient.patch<ApiResponse<SafeUser>>('/users/me', dto);
    return res.data.data;
  },

  /**
   * Uploads an avatar image.
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await apiClient.post<ApiResponse<{ avatarUrl: string }>>(
      '/users/me/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  /**
   * Removes the customer's avatar.
   */
  async deleteAvatar(): Promise<void> {
    await apiClient.delete<ApiResponse<null>>('/users/me/avatar');
  },

  /**
   * Retrieves customer account dashboard summary statistics.
   */
  async getDashboardSummary(): Promise<CustomerDashboardSummaryDto> {
    const res =
      await apiClient.get<ApiResponse<CustomerDashboardSummaryDto>>('/users/me/dashboard');
    return res.data.data;
  },

  /**
   * Initiates an email address update request.
   */
  async requestEmailChange(dto: RequestEmailChangeDto): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/users/me/email-change', dto);
    return res.data.message || 'Verification email dispatched.';
  },

  /**
   * Confirms an email address update using the verification token.
   */
  async verifyEmailChange(dto: VerifyEmailChangeDto): Promise<SafeUser> {
    const res = await apiClient.post<ApiResponse<SafeUser>>('/users/me/email-change/verify', dto);
    return res.data.data;
  },

  /**
   * Resends the verification email for a pending email change.
   */
  async resendEmailChange(): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/users/me/email-change/resend');
    return res.data.message || 'Verification email resent.';
  },

  /**
   * Requests immediate account deactivation.
   */
  async requestDeactivation(dto: DeactivationRequestDto): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/users/me/deactivation-request', dto);
    return res.data.message || 'Account deactivated.';
  },

  /**
   * Requests GDPR / privacy account deletion.
   */
  async requestDeletion(dto: DeletionRequestDto): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/users/me/deletion-request', dto);
    return res.data.message || 'Account deletion request registered.';
  },

  /**
   * Checks the status of a pending deletion request.
   */
  async getDeletionStatus(): Promise<DeletionStatusDto> {
    const res = await apiClient.get<ApiResponse<DeletionStatusDto>>('/users/me/deletion-request');
    return res.data.data;
  },
};
