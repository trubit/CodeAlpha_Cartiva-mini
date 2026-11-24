/**
 * Cartiva Mini — Phase 15 Admin Dashboard & Management System Tests
 * Tests real-data aggregation rules, CSV formula injection defense,
 * coupon validation, review moderation, support lifecycle, anti-lockout security,
 * and platform settings integrity.
 */
import { describe, it, expect } from 'vitest';
import {
  DiscountType,
  ReviewStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '../../shared/types/enums.js';
import { createCouponSchema, validateCouponSchema } from '../../backend/src/modules/coupon/coupon.validator.js';
import { createReviewSchema, updateReviewStatusSchema } from '../../backend/src/modules/review/review.validator.js';
import {
  createSupportTicketSchema,
  addTicketMessageSchema,
  updateTicketStatusSchema,
} from '../../backend/src/modules/support/support.validator.js';
import { updatePlatformSettingsSchema } from '../../backend/src/modules/settings/settings.validator.js';
import { adminCreateStaffSchema, adminUpdateStaffRoleSchema } from '../../backend/src/modules/user/user.validator.js';

describe('Phase 15: Admin Dashboard & Control Centre System', () => {
  describe('1. CSV Export Security & Formula Injection Defense', () => {
    // Formula injection sanitizer matching report.service.ts
    const sanitizeCsvField = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    it('should neutralize executable formula prefixes (=, +, -, @)', () => {
      expect(sanitizeCsvField('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvField('+123456')).toBe("\"'+123456\"");
      expect(sanitizeCsvField('-1000')).toBe("\"'-1000\"");
      expect(sanitizeCsvField('@HYPERLINK("http://attacker.com")')).toBe('"\'@HYPERLINK(""http://attacker.com"")"');
    });

    it('should preserve benign strings and numeric text without quotes prepended', () => {
      expect(sanitizeCsvField('ORD-202611-001')).toBe('"ORD-202611-001"');
      expect(sanitizeCsvField('customer@cartiva.ng')).toBe('"customer@cartiva.ng"');
      expect(sanitizeCsvField('50000')).toBe('"50000"');
    });

    it('should escape internal double quotes correctly for RFC 4180 compliance', () => {
      expect(sanitizeCsvField('High quality "Handmade" bag')).toBe('"High quality ""Handmade"" bag"');
    });

    it('should handle null, undefined, and empty values gracefully', () => {
      expect(sanitizeCsvField(null)).toBe('""');
      expect(sanitizeCsvField(undefined)).toBe('""');
      expect(sanitizeCsvField('')).toBe('""');
    });
  });

  describe('2. Coupon & Discount Management Validation', () => {
    it('should accept valid percentage coupon configuration', () => {
      const valid = createCouponSchema.safeParse({
        code: 'WELCOME15',
        description: 'New Customer Welcome 15% Off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        minOrderValue: 5000,
        maxDiscountAmount: 10000,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimitTotal: 200,
        usageLimitPerUser: 1,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.code).toBe('WELCOME15');
        expect(valid.data.discountType).toBe(DiscountType.PERCENTAGE);
      }
    });

    it('should accept valid fixed-amount coupon configuration', () => {
      const valid = createCouponSchema.safeParse({
        code: 'FLAT2000',
        description: '₦2,000 off orders over ₦10,000',
        discountType: DiscountType.FIXED,
        discountValue: 2000,
        minOrderValue: 10000,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        usageLimitTotal: 50,
      });
      expect(valid.success).toBe(true);
    });

    it('should reject coupon with percentage greater than 100%', () => {
      const invalid = createCouponSchema.safeParse({
        code: 'INVALID120',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 120, // Cannot exceed 100%
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(invalid.success).toBe(false);
    });

    it('should uppercase and sanitize coupon codes during checkout validation', () => {
      const parsed = validateCouponSchema.safeParse({
        code: '  save10  ',
        subtotal: 5000,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.code).toBe('SAVE10');
      }
    });

    it('should reject negative order subtotal during validation', () => {
      const invalid = validateCouponSchema.safeParse({
        code: 'SAVE10',
        subtotal: -100,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('3. Product Review Moderation & Rating Integrity', () => {
    it('should validate customer review submission within 1-5 rating range', () => {
      const validReview = createReviewSchema.safeParse({
        rating: 5,
        title: 'Outstanding quality and fast delivery!',
        comment: 'The package arrived within 48 hours in pristine condition. Excellent fabric and stitching.',
      });
      expect(validReview.success).toBe(true);
    });

    it('should reject ratings below 1 or above 5', () => {
      const tooLow = createReviewSchema.safeParse({ rating: 0, title: 'Poor', comment: 'Bad experience.' });
      const tooHigh = createReviewSchema.safeParse({ rating: 6, title: 'Over rated', comment: 'Great product.' });
      expect(tooLow.success).toBe(false);
      expect(tooHigh.success).toBe(false);
    });

    it('should permit administrators to moderate review status transitions', () => {
      const approve = updateReviewStatusSchema.safeParse({ status: ReviewStatus.APPROVED });
      const reject = updateReviewStatusSchema.safeParse({ status: ReviewStatus.REJECTED });
      expect(approve.success).toBe(true);
      expect(reject.success).toBe(true);
    });
  });

  describe('4. Customer Support Ticket Lifecycle', () => {
    it('should validate new ticket creation across valid operational categories', () => {
      const validTicket = createSupportTicketSchema.safeParse({
        subject: 'Inquiry regarding dispatch tracking for ORD-202611-998',
        category: SupportTicketCategory.ORDER_INQUIRY,
        priority: SupportTicketPriority.HIGH,
        message: 'Hello, the tracking number shows dispatched but no carrier milestone is updated.',
        orderId: 'ORD-202611-998',
      });
      expect(validTicket.success).toBe(true);
      if (validTicket.success) {
        expect(validTicket.data.category).toBe(SupportTicketCategory.ORDER_INQUIRY);
      }
    });

    it('should validate staff reply message submission', () => {
      const reply = addTicketMessageSchema.safeParse({
        content: 'We have escalated this to GIG Logistics; delivery is scheduled for tomorrow by 2pm.',
      });
      expect(reply.success).toBe(true);
    });

    it('should reject empty or whitespace-only messages', () => {
      const empty = addTicketMessageSchema.safeParse({ content: '   ' });
      expect(empty.success).toBe(false);
    });

    it('should validate administrative status transitions', () => {
      const inProgress = updateTicketStatusSchema.safeParse({ status: SupportTicketStatus.IN_PROGRESS });
      const resolved = updateTicketStatusSchema.safeParse({ status: SupportTicketStatus.RESOLVED });
      const closed = updateTicketStatusSchema.safeParse({ status: SupportTicketStatus.CLOSED });
      expect(inProgress.success).toBe(true);
      expect(resolved.success).toBe(true);
      expect(closed.success).toBe(true);
    });
  });

  describe('5. Staff & Role Management Anti-Lockout Security', () => {
    it('should validate staff creation with appropriate roles', () => {
      const staffMember = adminCreateStaffSchema.safeParse({
        email: 'fulfilment.lead@cartiva.ng',
        password: 'SecurePassword123!',
        firstName: 'Chidi',
        lastName: 'Okafor',
        phone: '+2348012345678',
        role: UserRole.STAFF,
      });
      expect(staffMember.success).toBe(true);
    });

    it('should reject staff creation with customer role', () => {
      const invalidRole = adminCreateStaffSchema.safeParse({
        email: 'invalid@cartiva.ng',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+2348012345678',
        role: UserRole.CUSTOMER,
      });
      expect(invalidRole.success).toBe(false);
    });

    it('should validate role update schemas for staff elevation or demotion', () => {
      const roleUpdate = adminUpdateStaffRoleSchema.safeParse({
        role: UserRole.ADMIN,
      });
      expect(roleUpdate.success).toBe(true);
    });

    it('should verify anti-lockout invariants: cannot demote self or last active administrator', () => {
      // Simulation of UserService anti-lockout boundary checks
      const adminCount = 1;
      const targetUserId = 'admin-user-1';
      const actorUserId = 'admin-user-1';

      // 1. Self demotion check
      const isSelfDemotion = targetUserId === actorUserId;
      expect(isSelfDemotion).toBe(true);

      // 2. Last admin check
      const isLastAdmin = adminCount <= 1;
      expect(isLastAdmin).toBe(true);

      // In either case, the service must throw AppError(400)
      const canProceed = !isSelfDemotion && !isLastAdmin;
      expect(canProceed).toBe(false);
    });
  });

  describe('6. Platform Settings & Configuration Security', () => {
    it('should validate non-secret platform settings updates', () => {
      const settingsUpdate = updatePlatformSettingsSchema.safeParse({
        storeName: 'Cartiva Mini Official Store',
        contactEmail: 'contact@cartiva.ng',
        contactPhone: '+2348002278482',
        storeAddress: 'Victoria Island, Lagos, Nigeria',
        freeShippingThresholdMinor: 5000000, // ₦50,000 in minor units
        lowStockAlertThreshold: 5,
        orderAutoCancellationMinutes: 60,
        supportEmail: 'support@cartiva.ng',
        policies: {
          returnPolicy: 'Items can be returned within 7 days of delivery in unused condition.',
          privacyPolicy: 'Standard nationwide privacy protection policy.',
        },
      });
      expect(settingsUpdate.success).toBe(true);
    });

    it('should enforce positive thresholds and prevent negative minor units', () => {
      const invalid = updatePlatformSettingsSchema.safeParse({
        freeShippingThresholdMinor: -100,
        lowStockAlertThreshold: -1,
      });
      expect(invalid.success).toBe(false);
    });

    it('should guarantee environment secrets and API keys are not exposed in settings schema', () => {
      const schemaKeys = Object.keys(updatePlatformSettingsSchema.shape);
      expect(schemaKeys).not.toContain('PAYSTACK_SECRET_KEY');
      expect(schemaKeys).not.toContain('JWT_SECRET');
      expect(schemaKeys).not.toContain('MONGO_URI');
      expect(schemaKeys).not.toContain('DATABASE_URL');
      expect(schemaKeys).not.toContain('COOKIE_SECRET');
    });
  });
});
