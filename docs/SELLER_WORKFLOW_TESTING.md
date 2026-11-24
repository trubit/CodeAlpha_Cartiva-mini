# Seller Workflow Analysis & Architecture Record — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Integration & Verification)  
**Status:** Architecture Reviewed & Documented  

---

## 1. Architectural Scope Analysis

Cartiva Mini is designed, specified, and implemented as a **Direct Retail E-Commerce Platform (B2C)** with server-authoritative inventory, centralized fulfillment hubs (e.g., Ikeja GRA, Lagos), and internal staff operations.

As defined in the authoritative codebase:
1. **User Roles (`shared/types/enums.ts`):**
   ```ts
   export enum UserRole {
     CUSTOMER = 'customer',
     STAFF = 'staff',
     ADMIN = 'admin',
   }
   ```
2. **Operations Model:**
   - Product catalog, inventory stock, fulfillment shipments, and payments are managed centrally by `admin` and `staff` operators.
   - Customers shop directly from Cartiva Mini's verified inventory.
   - Third-party multi-vendor marketplace functionality (vendor registration, seller KYC documents, vendor payouts, multi-seller product ownership) was not part of Phases 1–17 specifications.

---

## 2. Status of Seller Workflows

| Capability | Implementation Status | Notes |
|---|---|---|
| **Seller Registration** | Not In Scope / B2C Model | Platform uses direct retail model. |
| **Seller KYC & Documents** | Not In Scope / B2C Model | Operations are centralized through internal staff. |
| **Vendor Store Setup** | Not In Scope / B2C Model | Single unified brand storefront (Cartiva Mini). |
| **Vendor Withdrawals & Commissions** | Not In Scope / B2C Model | Financial processing is direct customer-to-merchant via Paystack. |
| **Seller Data Isolation / IDOR** | Enforced on Customer & Admin | Strict customer isolation is active across all endpoints. |

Per the strict completion rule, **no mock seller data, artificial KYC workflows, or simulated vendor endpoints have been fabricated**.

