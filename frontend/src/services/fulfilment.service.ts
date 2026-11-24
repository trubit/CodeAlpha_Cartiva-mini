/**
 * Cartiva Mini — Order Fulfilment & Delivery Tracking Frontend Service
 * Handles customer tracking queries and administrative fulfilment operations.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  CustomerTrackingDto,
  OrderFulfilmentDetailDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
  DeliveryConfirmationDto,
  DeliveryExceptionDto,
  UpdateFulfilmentStatusDto,
  FulfilmentFilterDto,
} from '@shared/api.types';

export const fulfilmentService = {
  /**
   * Retrieves live tracking timeline and courier progress for customer's order.
   */
  async getCustomerTracking(orderId: string): Promise<ApiResponse<CustomerTrackingDto>> {
    const response = await apiClient.get<ApiResponse<CustomerTrackingDto>>(
      `/orders/${encodeURIComponent(orderId)}/tracking`
    );
    return response.data;
  },

  /**
   * Retrieves fulfilment status and shipment summary for customer's order.
   */
  async getCustomerFulfilment(orderId: string): Promise<ApiResponse<CustomerTrackingDto>> {
    const response = await apiClient.get<ApiResponse<CustomerTrackingDto>>(
      `/orders/${encodeURIComponent(orderId)}/fulfilment`
    );
    return response.data;
  },

  /**
   * Administrative order list for fulfilment management.
   */
  async getAdminFulfilmentOrders(
    filter: FulfilmentFilterDto = {}
  ): Promise<ApiResponse<OrderFulfilmentDetailDto[]>> {
    const response = await apiClient.get<ApiResponse<OrderFulfilmentDetailDto[]>>(
      '/admin/fulfilment',
      { params: filter }
    );
    return response.data;
  },

  /**
   * Administrative detailed inspection of an order and its shipment timeline.
   */
  async getAdminFulfilmentOrderDetail(
    orderId: string
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.get<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/fulfilment/${encodeURIComponent(orderId)}`
    );
    return response.data;
  },

  /**
   * Advances order fulfilment status through the state machine.
   */
  async updateAdminFulfilmentStatus(
    orderId: string,
    data: UpdateFulfilmentStatusDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.patch<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/fulfilment/${encodeURIComponent(orderId)}/status`,
      data
    );
    return response.data;
  },

  /**
   * Creates a formal shipment record for a paid order.
   */
  async createAdminShipment(
    orderId: string,
    data: CreateShipmentDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.post<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/fulfilment/${encodeURIComponent(orderId)}/shipments`,
      data
    );
    return response.data;
  },

  /**
   * Updates shipment details (carrier, tracking URL, notes).
   */
  async updateAdminShipment(
    shipmentId: string,
    data: UpdateShipmentDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.patch<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/shipments/${encodeURIComponent(shipmentId)}`,
      data
    );
    return response.data;
  },

  /**
   * Appends an immutable tracking event to the shipment timeline.
   */
  async addAdminTrackingEvent(
    shipmentId: string,
    data: AddTrackingEventDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.post<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/shipments/${encodeURIComponent(shipmentId)}/events`,
      data
    );
    return response.data;
  },

  /**
   * Records secure delivery confirmation with recipient and timestamp.
   */
  async confirmAdminDelivery(
    shipmentId: string,
    data: DeliveryConfirmationDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.post<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/shipments/${encodeURIComponent(shipmentId)}/delivery-confirmation`,
      data
    );
    return response.data;
  },

  /**
   * Records a delivery exception in the shipment timeline.
   */
  async recordAdminDeliveryException(
    shipmentId: string,
    data: DeliveryExceptionDto
  ): Promise<ApiResponse<OrderFulfilmentDetailDto>> {
    const response = await apiClient.post<ApiResponse<OrderFulfilmentDetailDto>>(
      `/admin/shipments/${encodeURIComponent(shipmentId)}/exceptions`,
      data
    );
    return response.data;
  },
};
