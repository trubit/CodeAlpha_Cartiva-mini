/**
 * Cartiva Mini — Admin TanStack Query Hooks
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service.js';
import { couponService } from '../services/coupon.service.js';
import { reviewService } from '../services/review.service.js';
import { supportService } from '../services/support.service.js';
import { auditService } from '../services/audit.service.js';
import { settingsService } from '../services/settings.service.js';
import type {
  DashboardFilterDto,
  ReportFilterDto,
  CreateStaffDto,
  UpdateStaffRoleDto,
  CreateCouponDto,
  UpdateCouponDto,
  ReviewFilterDto,
  UpdateReviewStatusDto,
  TicketFilterDto,
  AddTicketMessageDto,
  UpdateTicketStatusDto,
  AuditFilterDto,
  UpdatePlatformSettingsDto,
} from '@shared/api.types.js';

// ==========================================
// 1. Dashboard & Reports Hooks
// ==========================================

export const useAdminDashboardSummary = (filters?: DashboardFilterDto) => {
  return useQuery({
    queryKey: ['admin-dashboard-summary', filters],
    queryFn: () => adminService.getDashboardSummary(filters),
    staleTime: 30000,
  });
};

export const useAdminDashboardCharts = (filters?: DashboardFilterDto) => {
  return useQuery({
    queryKey: ['admin-dashboard-charts', filters],
    queryFn: () => adminService.getDashboardCharts(filters),
    staleTime: 30000,
  });
};

export const useAdminSalesReport = (filters?: ReportFilterDto) => {
  return useQuery({
    queryKey: ['admin-sales-report', filters],
    queryFn: () => adminService.getSalesReport(filters),
    staleTime: 30000,
  });
};

// ==========================================
// 2. Staff Management Hooks
// ==========================================

export const useAdminStaff = () => {
  return useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => adminService.listStaff(),
  });
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStaffDto) => adminService.createStaff(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] });
    },
  });
};

export const useUpdateStaffRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto: UpdateStaffRoleDto }) =>
      adminService.updateStaffRole(userId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] });
    },
  });
};

export const useReviewDeletionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      dto,
    }: {
      userId: string;
      dto: { deletionStatus: 'approved' | 'rejected'; reason?: string };
    }) => adminService.reviewDeletionRequest(userId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });
};

// ==========================================
// 3. Coupon Hooks
// ==========================================

export const useCoupons = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: ['admin-coupons', params],
    queryFn: () => couponService.listCoupons(params),
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCouponDto) => couponService.createCoupon(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCouponDto }) =>
      couponService.updateCoupon(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });
};

export const useToggleCouponStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponService.toggleCouponStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });
};

// ==========================================
// 4. Review Hooks
// ==========================================

export const useReviews = (params?: ReviewFilterDto) => {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => reviewService.listReviews(params),
  });
};

export const useUpdateReviewStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReviewStatusDto }) =>
      reviewService.updateReviewStatus(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
};

// ==========================================
// 5. Customer Support Hooks
// ==========================================

export const useAdminTickets = (params?: TicketFilterDto) => {
  return useQuery({
    queryKey: ['admin-support-tickets', params],
    queryFn: () => supportService.listAdminTickets(params),
  });
};

export const useAdminTicketDetail = (id?: string) => {
  return useQuery({
    queryKey: ['admin-support-ticket', id],
    queryFn: () => supportService.getAdminTicketDetail(id!),
    enabled: !!id,
  });
};

export const useAddAdminTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AddTicketMessageDto }) =>
      supportService.addAdminMessage(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTicketStatusDto }) =>
      supportService.updateTicketStatus(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    },
  });
};

// ==========================================
// 6. Audit Log Hooks
// ==========================================

export const useAuditLogs = (params?: AuditFilterDto) => {
  return useQuery({
    queryKey: ['admin-audit-logs', params],
    queryFn: () => auditService.listLogs(params),
  });
};

// ==========================================
// 7. Platform Settings Hooks
// ==========================================

export const useAdminSettings = () => {
  return useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => settingsService.getAdminSettings(),
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePlatformSettingsDto) => settingsService.updateSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
    },
  });
};
