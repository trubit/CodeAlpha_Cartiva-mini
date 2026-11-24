/**
 * Cartiva Mini — Phase 14 Order Fulfilment & Delivery Tracking Tests
 * Tests payment verification gates, state machine transitions, carrier abstraction,
 * append-only tracking timelines, delivery confirmation, and exception handling.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  DeliveryExceptionType,
  UserRole,
} from '../../shared/types/enums.js';
import { CarrierProviderFactory } from '../../backend/src/modules/fulfilment/carriers/carrier.factory.js';
import { PERMITTED_STATUS_TRANSITIONS } from '../../backend/src/modules/order/order.constants.js';
import {
  createShipmentSchema,
  deliveryConfirmationSchema,
  deliveryExceptionSchema,
} from '../../backend/src/modules/fulfilment/fulfilment.validator.js';
import { fulfilmentService } from '../../backend/src/modules/fulfilment/fulfilment.service.js';
import { fulfilmentRepository } from '../../backend/src/modules/fulfilment/fulfilment.repository.js';
import type { OrderDocument } from '../../backend/src/models/Order.model.js';
import type { ShipmentDocument } from '../../backend/src/models/Shipment.model.js';

describe('Phase 14: Order Fulfilment & Tracking Architecture', () => {
  describe('Carrier Provider Integration Boundary', () => {
    it('should resolve In-House Logistics by default', () => {
      const provider = CarrierProviderFactory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('Cartiva In-House Logistics');
      expect(provider.isAutomated).toBe(false);
    });

    it('should resolve recognized carriers with standard manual fallback', () => {
      const gig = CarrierProviderFactory.getProvider('GIG Logistics');
      expect(gig.providerName).toBe('GIG Logistics');
      expect(gig.isAutomated).toBe(false);

      const dhl = CarrierProviderFactory.getProvider('DHL Express');
      expect(dhl.providerName).toBe('DHL Express');
    });

    it('should generate valid formatted tracking numbers from shipment references', () => {
      const provider = CarrierProviderFactory.getProvider('GIG Logistics');
      const trackingNo = provider.generateTrackingNumber('SHP-202611-ABC123');
      expect(trackingNo).toMatch(/^CRTV-202611ABC123-[A-Z0-9]+$/);
    });

    it('should validate tracking number formats correctly', () => {
      const provider = CarrierProviderFactory.getProvider();
      expect(provider.validateTrackingNumber('CRTV-123456')).toBe(true);
      expect(provider.validateTrackingNumber('short')).toBe(false);
      expect(provider.validateTrackingNumber('')).toBe(false);
    });
  });

  describe('Fulfilment State Machine Transitions', () => {
    it('should permit sequential progression from CONFIRMED through DELIVERED', () => {
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.CONFIRMED]).toContain(
        OrderStatus.PROCESSING
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.PROCESSING]).toContain(
        OrderStatus.PACKED
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.PACKED]).toContain(
        OrderStatus.READY_FOR_SHIPMENT
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.READY_FOR_SHIPMENT]).toContain(
        OrderStatus.SHIPPED
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).toContain(
        OrderStatus.OUT_FOR_DELIVERY
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.OUT_FOR_DELIVERY]).toContain(
        OrderStatus.DELIVERED
      );
    });

    it('should strictly prohibit direct jumping from CONFIRMED to DELIVERED', () => {
      const allowedFromConfirmed = PERMITTED_STATUS_TRANSITIONS[OrderStatus.CONFIRMED] || [];
      expect(allowedFromConfirmed).not.toContain(OrderStatus.DELIVERED);
      expect(allowedFromConfirmed).not.toContain(OrderStatus.OUT_FOR_DELIVERY);
    });

    it('should support delivery exception transitions and re-attempting delivery', () => {
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.OUT_FOR_DELIVERY]).toContain(
        OrderStatus.DELIVERY_FAILED
      );
      expect(PERMITTED_STATUS_TRANSITIONS[OrderStatus.DELIVERY_FAILED]).toContain(
        OrderStatus.OUT_FOR_DELIVERY
      );
    });
  });

  describe('Zod Validation for Fulfilment Endpoints', () => {
    it('should validate a complete shipment creation payload', () => {
      const validPayload = {
        carrierName: 'GIG Logistics',
        carrierService: 'Next-Day Priority',
        trackingNumber: 'GIG-LAG-98765',
        estimatedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
        dispatchNow: true,
      };

      const parsed = createShipmentSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it('should reject shipment creation without carrier name', () => {
      const invalid = { dispatchNow: true };
      const parsed = createShipmentSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should require recipient name for delivery confirmation', () => {
      const valid = { deliveredTo: 'Adebayo Ogunlesi', deliveryNotes: 'Signed at gate' };
      const parsed = deliveryConfirmationSchema.safeParse(valid);
      expect(parsed.success).toBe(true);

      const invalid = { deliveryNotes: 'Left at reception' };
      const failed = deliveryConfirmationSchema.safeParse(invalid);
      expect(failed.success).toBe(false);
    });

    it('should validate delivery exceptions with correct enum types', () => {
      const valid = {
        exceptionType: DeliveryExceptionType.CUSTOMER_UNAVAILABLE,
        description: 'Customer did not answer intercom after 3 calls.',
      };
      const parsed = deliveryExceptionSchema.safeParse(valid);
      expect(parsed.success).toBe(true);

      const invalid = {
        exceptionType: 'PARCEL_LOST_IN_SPACE',
        description: 'Unknown problem',
      };
      const failed = deliveryExceptionSchema.safeParse(invalid);
      expect(failed.success).toBe(false);
    });
  });

  describe('Business Rules & Payment Verification Gates', () => {
    const mockStaff = {
      id: '507f1f77bcf86cd799439011',
      email: 'logistics.admin@cartiva.com',
      firstName: 'Logistics',
      lastName: 'Manager',
      role: UserRole.ADMIN,
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('CRITICAL: should reject fulfilment status update for UNPAID orders', async () => {
      vi.spyOn(fulfilmentRepository, 'findOrderByIdOrNumber').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439099' as unknown as Types.ObjectId,
        orderNumber: 'ORD-UNPAID-001',
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING, // UNPAID
      } as unknown as OrderDocument);

      await expect(
        fulfilmentService.updateFulfilmentStatus(mockStaff, 'ORD-UNPAID-001', {
          status: OrderStatus.PROCESSING,
        })
      ).rejects.toThrowError(/Payment has not been verified/);
    });

    it('CRITICAL: should reject shipment creation for UNPAID orders', async () => {
      vi.spyOn(fulfilmentRepository, 'findOrderByIdOrNumber').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439099' as unknown as Types.ObjectId,
        orderNumber: 'ORD-UNPAID-002',
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.FAILED, // FAILED PAYMENT
      } as unknown as OrderDocument);

      await expect(
        fulfilmentService.createShipment(mockStaff, 'ORD-UNPAID-002', {
          carrierName: 'GIG Logistics',
        })
      ).rejects.toThrowError(/payment has not been verified/);
    });

    it('should reject creating duplicate active shipments for the same order', async () => {
      vi.spyOn(fulfilmentRepository, 'findOrderByIdOrNumber').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439088' as unknown as Types.ObjectId,
        orderNumber: 'ORD-PAID-001',
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID, // Verified Paid
      } as unknown as OrderDocument);

      vi.spyOn(fulfilmentRepository, 'findShipmentByOrderId').mockResolvedValueOnce({
        shipmentReference: 'SHP-EXISTING-01',
        status: ShipmentStatus.PROCESSING,
      } as unknown as ShipmentDocument);

      await expect(
        fulfilmentService.createShipment(mockStaff, 'ORD-PAID-001', {
          carrierName: 'GIG Logistics',
        })
      ).rejects.toThrowError(/already exists for this order/);
    });

    it('should prevent re-confirming already delivered shipments', async () => {
      vi.spyOn(fulfilmentRepository, 'findShipmentById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439077' as unknown as Types.ObjectId,
        status: ShipmentStatus.DELIVERED,
      } as unknown as ShipmentDocument);

      await expect(
        fulfilmentService.confirmDelivery(mockStaff, '507f1f77bcf86cd799439077', {
          deliveredTo: 'Chidi Mokeme',
        })
      ).rejects.toThrowError(/already been confirmed for this shipment/);
    });

    it('should prevent customers from viewing another customer tracking (IDOR prevention)', async () => {
      vi.spyOn(fulfilmentRepository, 'findOrderByIdOrNumber').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439066' as unknown as Types.ObjectId,
        orderNumber: 'ORD-PRIVATE-001',
        userId: { toString: () => '507f1f77bcf86cd799439999' } as unknown as Types.ObjectId, // Belonging to user 999
      } as unknown as OrderDocument);

      // Requesting as user 111
      await expect(
        fulfilmentService.getCustomerTracking('507f1f77bcf86cd799439111', 'ORD-PRIVATE-001')
      ).rejects.toThrowError(/not authorized to view tracking/);
    });
  });
});
