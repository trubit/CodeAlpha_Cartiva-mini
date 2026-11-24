import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ShippingCalculationType } from '@shared/enums.js';
import {
  shippingAvailabilityQuerySchema as shippingAvailabilitySchema,
  shippingQuoteSchema,
  createShippingConfigSchema,
} from '../../backend/src/modules/shipping/shipping.validator.js';

describe('Shipping & Delivery Frontend Validation & Display Logic', () => {
  // ==========================================================================
  // International Address Form Validation
  // ==========================================================================
  const internationalAddressFormSchema = z.object({
    recipientName: z.string().trim().min(2, 'Recipient name must be at least 2 characters'),
    phone: z.string().trim().min(7, 'Valid phone number required'),
    street: z.string().trim().min(5, 'Street address is required'),
    apartment: z.string().trim().optional(),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().min(2, 'State or province is required'),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().min(2, 'Country is required'),
    isDefault: z.boolean().default(false),
  });

  describe('Address Validation', () => {
    it('should successfully validate standard Nigerian delivery address', () => {
      const validNaija = {
        recipientName: 'Chidinma Adebayo',
        phone: '+234 803 123 4567',
        street: '14 Admiralty Way, Block B, Suite 4',
        apartment: 'Apt 2B',
        city: 'Lekki Phase 1',
        state: 'Lagos',
        country: 'Nigeria',
        isDefault: true,
      };

      const result = internationalAddressFormSchema.safeParse(validNaija);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('Nigeria');
        expect(result.data.state).toBe('Lagos');
      }
    });

    it('should successfully validate international delivery addresses (UK & US)', () => {
      const validUk = {
        recipientName: 'Oliver Smith',
        phone: '+44 20 7946 0958',
        street: '10 Downing Street',
        city: 'London',
        state: 'Greater London',
        postalCode: 'SW1A 2AA',
        country: 'United Kingdom',
        isDefault: false,
      };

      const result = internationalAddressFormSchema.safeParse(validUk);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postalCode).toBe('SW1A 2AA');
      }
    });

    it('should reject incomplete address with missing street or recipient', () => {
      const invalidAddress = {
        recipientName: 'J',
        phone: '123',
        street: '',
        city: '',
        state: '',
        country: 'Nigeria',
      };

      const result = internationalAddressFormSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.format();
        expect(issues.recipientName?._errors).toBeDefined();
        expect(issues.phone?._errors).toBeDefined();
        expect(issues.street?._errors).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Currency & Minor Unit Financial Display Logic
  // ==========================================================================
  describe('Fee Display & Currency Precision', () => {
    const formatShippingPrice = (amountMinor: number, currency = 'NGN'): string => {
      const major = amountMinor / 100;
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(major);
    };

    it('should correctly format minor units to currency display string', () => {
      expect(formatShippingPrice(250000)).toMatch(/2,500\.00/);
      expect(formatShippingPrice(0)).toMatch(/0\.00/);
      expect(formatShippingPrice(450050)).toMatch(/4,500\.50/);
    });

    it('should handle free delivery threshold detection', () => {
      const freeThresholdMinor = 5000000; // ₦50,000.00
      const orderSubtotalMinor = 5500000; // ₦55,000.00
      const qualifies = orderSubtotalMinor >= freeThresholdMinor;
      expect(qualifies).toBe(true);

      const smallerOrderSubtotalMinor = 3500000; // ₦35,000.00
      expect(smallerOrderSubtotalMinor >= freeThresholdMinor).toBe(false);
    });
  });

  // ==========================================================================
  // Homepage Product Display & Pricing Logic
  // ==========================================================================
  describe('Homepage Presentation Logic', () => {
    it('should accurately compute effective price and discount badge', () => {
      const productOnSale = {
        regularPrice: 20000,
        salePrice: 16000,
      };

      const effectivePrice =
        productOnSale.salePrice && productOnSale.salePrice > 0
          ? productOnSale.salePrice
          : productOnSale.regularPrice;

      const discountPercent =
        productOnSale.salePrice && productOnSale.salePrice < productOnSale.regularPrice
          ? Math.round(
              ((productOnSale.regularPrice - productOnSale.salePrice) /
                productOnSale.regularPrice) *
                100
            )
          : null;

      expect(effectivePrice).toBe(16000);
      expect(discountPercent).toBe(20);
    });

    it('should not display discount badge when product has no sale price', () => {
      const productRegular = {
        regularPrice: 15000,
        salePrice: undefined,
      };

      const discountPercent =
        productRegular.salePrice && productRegular.salePrice < productRegular.regularPrice
          ? Math.round(
              ((productRegular.regularPrice - productRegular.salePrice) /
                productRegular.regularPrice) *
                100
            )
          : null;

      expect(discountPercent).toBeNull();
    });
  });

  // ==========================================================================
  // Admin Shipping Configuration Validation Schema
  // ==========================================================================
  describe('Admin Configuration Schema Validation', () => {
    it('should validate valid flat rate shipping config', () => {
      const validConfig = {
        zoneName: 'Lagos Metropolitan Zone',
        methodName: 'Standard Courier',
        carrierName: 'GIG Logistics',
        countriesCovered: ['Nigeria'],
        statesCovered: ['Lagos'],
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 2500,
        currency: 'NGN',
        estimatedDeliveryDaysMin: 1,
        estimatedDeliveryDaysMax: 2,
        isActive: true,
      };

      const parsed = createShippingConfigSchema.safeParse(validConfig);
      expect(parsed.success).toBe(true);
    });

    it('should reject configuration with negative base rate or inverted transit days', () => {
      const invalidConfig = {
        zoneName: 'Lagos Zone',
        methodName: 'Negative Rate Shipping',
        carrierName: 'GIG Logistics',
        countriesCovered: ['Nigeria'],
        statesCovered: ['Lagos'],
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: -500, // Negative fee prohibited
        currency: 'NGN',
        estimatedDeliveryDaysMin: 5,
        estimatedDeliveryDaysMax: 2, // Inverted transit days
        isActive: true,
      };

      const parsed = createShippingConfigSchema.safeParse(invalidConfig);
      expect(parsed.success).toBe(false);
    });

    it('should validate shipping availability schema', () => {
      const validQuery = {
        country: 'Nigeria',
        state: 'Lagos',
      };
      const parsed = shippingAvailabilitySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);

      const invalidQuery = {
        country: '',
      };
      const failed = shippingAvailabilitySchema.safeParse(invalidQuery);
      expect(failed.success).toBe(false);
    });

    it('should validate shipping quote request schema', () => {
      const validQuoteRequest = {
        destination: {
          country: 'Nigeria',
          state: 'Lagos',
          city: 'Ikeja',
        },
      };
      const parsed = shippingQuoteSchema.safeParse(validQuoteRequest);
      expect(parsed.success).toBe(true);

      const emptyRequest = {};
      const failed = shippingQuoteSchema.safeParse(emptyRequest);
      expect(failed.success).toBe(false);
    });
  });
});
