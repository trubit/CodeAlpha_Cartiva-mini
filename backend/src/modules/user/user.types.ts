import type { SafeUser, AddressDto } from '@shared/api.types.js';

export interface AvatarUploadResult {
  avatarUrl: string;
  publicId?: string;
}

export interface CustomerProfileView extends SafeUser {
  addressCount: number;
}

export interface AdminUserPaginationOptions {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  deletionStatus?: string;
}

export interface PaginatedAdminUsers {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    isActive: boolean;
    isEmailVerified: boolean;
    avatarUrl?: string;
    addressCount: number;
    deletionStatus: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type FormattedAddress = AddressDto;
