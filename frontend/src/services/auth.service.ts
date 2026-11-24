import { apiClient } from './api';
import type {
  ApiResponse,
  AuthResponseData,
  SafeUser,
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SessionDto,
  VerifyOtpDto,
  ResendOtpDto,
} from '@shared/api.types.js';

export const authService = {
  async register(data: RegisterDto): Promise<ApiResponse<SafeUser>> {
    const response = await apiClient.post<ApiResponse<SafeUser>>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginDto): Promise<ApiResponse<AuthResponseData>> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', data);
    return response.data;
  },

  async refresh(): Promise<ApiResponse<AuthResponseData>> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  async logoutAll(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/logout-all');
    return response.data;
  },

  async getMe(): Promise<ApiResponse<SafeUser>> {
    const response = await apiClient.get<ApiResponse<SafeUser>>('/auth/me');
    return response.data;
  },

  async verifyOtp(data: VerifyOtpDto): Promise<ApiResponse<{ userId: string }>> {
    const response = await apiClient.post<ApiResponse<{ userId: string }>>('/auth/verify-otp', data);
    return response.data;
  },

  async resendOtp(data: ResendOtpDto): Promise<ApiResponse<{ cooldownSeconds: number }>> {
    const response = await apiClient.post<ApiResponse<{ cooldownSeconds: number }>>('/auth/resend-otp', data);
    return response.data;
  },

  async resendVerification(email: string): Promise<ApiResponse<{ cooldownSeconds: number }>> {
    return this.resendOtp({ email, purpose: 'email_verification' });
  },

  async forgotPassword(data: ForgotPasswordDto): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordDto): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/reset-password', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordDto): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/change-password', data);
    return response.data;
  },

  async getSessions(): Promise<ApiResponse<SessionDto[]>> {
    const response = await apiClient.get<ApiResponse<SessionDto[]>>('/auth/sessions');
    return response.data;
  },

  async revokeSession(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/auth/sessions/${id}`);
    return response.data;
  },
};
