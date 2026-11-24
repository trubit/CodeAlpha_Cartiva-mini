/**
 * Cartiva Mini — Payment Frontend Service
 * Client communication for payment initiation, verification, customer transaction history,
 * administrative payment portal, refunds, and financial reconciliation.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  InitializePaymentDto,
  PaymentInitializationResultDto,
  VerifyPaymentResultDto,
  PaymentDetailsDto,
  PaymentListItemDto,
  CreateRefundDto,
  RefundDto,
  PaymentFilterDto,
  RefundFilterDto,
  ReconciliationResultDto,
} from '@shared/api.types';

export const paymentService = {
  /**
   * Initializes payment session for a confirmed order awaiting payment.
   */
  async initializePayment(
    data: InitializePaymentDto
  ): Promise<ApiResponse<PaymentInitializationResultDto>> {
    const response = await apiClient.post<ApiResponse<PaymentInitializationResultDto>>(
      '/payments/initialize',
      data
    );
    return response.data;
  },

  /**
   * Authoritatively verifies transaction with Paystack via the backend.
   */
  async verifyPayment(reference: string): Promise<ApiResponse<VerifyPaymentResultDto>> {
    const response = await apiClient.get<ApiResponse<VerifyPaymentResultDto>>(
      `/payments/${encodeURIComponent(reference)}/verify`
    );
    return response.data;
  },

  /**
   * Retrieves single payment details for customer.
   */
  async getPayment(reference: string): Promise<ApiResponse<PaymentDetailsDto>> {
    const response = await apiClient.get<ApiResponse<PaymentDetailsDto>>(
      `/payments/${encodeURIComponent(reference)}`
    );
    return response.data;
  },

  /**
   * Lists customer's own payment transactions.
   */
  async getMyPayments(params: PaymentFilterDto = {}): Promise<ApiResponse<PaymentListItemDto[]>> {
    const response = await apiClient.get<ApiResponse<PaymentListItemDto[]>>('/payments', {
      params,
    });
    return response.data;
  },

  /**
   * Retries an abandoned or failed payment attempt.
   */
  async retryPayment(
    reference: string
  ): Promise<ApiResponse<PaymentInitializationResultDto>> {
    const response = await apiClient.post<ApiResponse<PaymentInitializationResultDto>>(
      `/payments/${encodeURIComponent(reference)}/retry`
    );
    return response.data;
  },

  /**
   * Admin: List platform transactions.
   */
  async getAdminPayments(
    params: PaymentFilterDto = {}
  ): Promise<ApiResponse<PaymentListItemDto[]>> {
    const response = await apiClient.get<ApiResponse<PaymentListItemDto[]>>('/admin/payments', {
      params,
    });
    return response.data;
  },

  /**
   * Admin: Get single payment details with full order & refund ledger.
   */
  async getAdminPayment(reference: string): Promise<ApiResponse<PaymentDetailsDto>> {
    const response = await apiClient.get<ApiResponse<PaymentDetailsDto>>(
      `/admin/payments/${encodeURIComponent(reference)}`
    );
    return response.data;
  },

  /**
   * Admin: Issue refund via Paystack.
   */
  async createRefund(
    paymentId: string,
    data: CreateRefundDto
  ): Promise<ApiResponse<RefundDto>> {
    const response = await apiClient.post<ApiResponse<RefundDto>>(
      `/admin/payments/${encodeURIComponent(paymentId)}/refunds`,
      data
    );
    return response.data;
  },

  /**
   * Admin: List refunds.
   */
  async getAdminRefunds(params: RefundFilterDto = {}): Promise<ApiResponse<RefundDto[]>> {
    const response = await apiClient.get<ApiResponse<RefundDto[]>>('/admin/payments/refunds', {
      params,
    });
    return response.data;
  },

  /**
   * Admin: Run ledger reconciliation against Paystack.
   */
  async runReconciliation(
    reference?: string
  ): Promise<ApiResponse<ReconciliationResultDto[]>> {
    const response = await apiClient.get<ApiResponse<ReconciliationResultDto[]>>(
      '/admin/payments/reconciliation',
      {
        params: reference ? { reference } : {},
      }
    );
    return response.data;
  },
};
