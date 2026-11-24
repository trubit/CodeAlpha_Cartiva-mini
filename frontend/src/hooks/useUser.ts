import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service.js';
import { useAuthStore } from '../stores/authStore.js';
import type {
  UpdateProfileDto,
  RequestEmailChangeDto,
  VerifyEmailChangeDto,
  DeactivationRequestDto,
  DeletionRequestDto,
} from '@shared/api.types.js';

export const USER_QUERY_KEYS = {
  profile: ['user', 'profile'] as const,
  dashboard: ['user', 'dashboard'] as const,
  deletionStatus: ['user', 'deletion-status'] as const,
};

export const useUserProfile = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: USER_QUERY_KEYS.profile,
    queryFn: () => userService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserDashboard = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: USER_QUERY_KEYS.dashboard,
    queryFn: () => userService.getDashboardSummary(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => userService.updateProfile(dto),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(USER_QUERY_KEYS.profile, updatedUser);
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.dashboard });
    },
  });
};

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.dashboard });
    },
  });
};

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userService.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.dashboard });
    },
  });
};

export const useRequestEmailChange = () => {
  return useMutation({
    mutationFn: (dto: RequestEmailChangeDto) => userService.requestEmailChange(dto),
  });
};

export const useVerifyEmailChange = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: (dto: VerifyEmailChangeDto) => userService.verifyEmailChange(dto),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });
};

export const useResendEmailChange = () => {
  return useMutation({
    mutationFn: () => userService.resendEmailChange(),
  });
};

export const useDeactivationRequest = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: (dto: DeactivationRequestDto) => userService.requestDeactivation(dto),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });
};

export const useDeletionRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: DeletionRequestDto) => userService.requestDeletion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.deletionStatus });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
    },
  });
};

export const useDeletionStatus = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: USER_QUERY_KEYS.deletionStatus,
    queryFn: () => userService.getDeletionStatus(),
    enabled: isAuthenticated,
  });
};
