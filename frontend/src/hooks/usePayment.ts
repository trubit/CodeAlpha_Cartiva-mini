/**
 * Cartiva Mini — Payment TanStack Query Hooks
 * Manages server state for payment initialization, server verification,
 * customer history, administrative payment management, refunds, and reconciliation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/payment.service';
import type {
  InitializePaymentDto,
  PaymentFilterDto,
  CreateRefundDto,
  RefundFilterDto,
} from '@shared/api.types';

export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  verify: (ref: string) => [...PAYMENT_KEYS.all, 'verify', ref] as const,
  detail: (ref: string) => [...PAYMENT_KEYS.all, 'detail', ref] as const,
  myList: (params?: PaymentFilterDto) => [...PAYMENT_KEYS.all, 'my', params] as const,
  adminList: (params?: PaymentFilterDto) => [...PAYMENT_KEYS.all, 'admin', params] as const,
  refunds: (params?: RefundFilterDto) => [...PAYMENT_KEYS.all, 'refunds', params] as const,
  reconciliation: (ref?: string) => [...PAYMENT_KEYS.all, 'reconciliation', ref] as const,
};

export const useInitializePaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InitializePaymentDto) => paymentService.initializePayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
    },
  });
};

export const useVerifyPayment = (
  reference: string,
  enabled = true,
  refetchInterval?: number | false
) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.verify(reference),
    queryFn: () => paymentService.verifyPayment(reference),
    enabled: Boolean(reference) && enabled,
    refetchInterval,
    retry: 2,
  });
};

export const usePaymentDetails = (reference: string, enabled = true) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.detail(reference),
    queryFn: () => paymentService.getPayment(reference),
    enabled: Boolean(reference) && enabled,
  });
};

export const useMyPayments = (params: PaymentFilterDto = {}, enabled = true) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.myList(params),
    queryFn: () => paymentService.getMyPayments(params),
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useRetryPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => paymentService.retryPayment(reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
    },
  });
};

export const useAdminPayments = (params: PaymentFilterDto = {}, enabled = true) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.adminList(params),
    queryFn: () => paymentService.getAdminPayments(params),
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useCreateRefundMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: CreateRefundDto }) =>
      paymentService.createRefund(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
    },
  });
};

export const useAdminRefunds = (params: RefundFilterDto = {}, enabled = true) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.refunds(params),
    queryFn: () => paymentService.getAdminRefunds(params),
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useAdminReconciliation = (reference?: string, enabled = true) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.reconciliation(reference),
    queryFn: () => paymentService.runReconciliation(reference),
    enabled,
  });
};
