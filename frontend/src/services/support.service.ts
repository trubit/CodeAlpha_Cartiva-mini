/**
 * Cartiva Mini — Customer Support Frontend Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  SupportTicketDto,
  CreateSupportTicketDto,
  AddTicketMessageDto,
  UpdateTicketStatusDto,
  TicketFilterDto,
  PaginatedTicketsDto,
} from '@shared/api.types.js';

export const supportService = {
  // Customer ticket operations
  async getMyTickets(): Promise<SupportTicketDto[]> {
    const response = await apiClient.get<ApiResponse<SupportTicketDto[]>>('/support/tickets');
    return response.data.data;
  },

  async createTicket(dto: CreateSupportTicketDto): Promise<SupportTicketDto> {
    const response = await apiClient.post<ApiResponse<SupportTicketDto>>('/support/tickets', dto);
    return response.data.data;
  },

  async getTicketDetail(ticketId: string): Promise<SupportTicketDto> {
    const response = await apiClient.get<ApiResponse<SupportTicketDto>>(
      `/support/tickets/${ticketId}`
    );
    return response.data.data;
  },

  async addMessage(ticketId: string, dto: AddTicketMessageDto): Promise<SupportTicketDto> {
    const response = await apiClient.post<ApiResponse<SupportTicketDto>>(
      `/support/tickets/${ticketId}/messages`,
      dto
    );
    return response.data.data;
  },

  // Admin ticket management
  async listAdminTickets(params?: TicketFilterDto): Promise<PaginatedTicketsDto> {
    const response = await apiClient.get<ApiResponse<SupportTicketDto[]>>('/admin/support/tickets', {
      params,
    });
    return {
      tickets: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getAdminTicketDetail(ticketId: string): Promise<SupportTicketDto> {
    const response = await apiClient.get<ApiResponse<SupportTicketDto>>(
      `/admin/support/tickets/${ticketId}`
    );
    return response.data.data;
  },

  async addAdminMessage(ticketId: string, dto: AddTicketMessageDto): Promise<SupportTicketDto> {
    const response = await apiClient.post<ApiResponse<SupportTicketDto>>(
      `/admin/support/tickets/${ticketId}/messages`,
      dto
    );
    return response.data.data;
  },

  async updateTicketStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto
  ): Promise<SupportTicketDto> {
    const response = await apiClient.patch<ApiResponse<SupportTicketDto>>(
      `/admin/support/tickets/${ticketId}/status`,
      dto
    );
    return response.data.data;
  },
};
