# Customer Workflow Testing — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (End-to-End Customer Journeys)  
**Status:** Tested & Verified  

---

## 1. Scope of Testing

Two end-to-end customer workflows were executed and verified across the frontend and backend integration surface:
1. **Workflow A:** New Customer Journey (Registration to Delivery Confirmation).
2. **Workflow B:** Returning Customer Journey (Session Restoration to Order History).

---

## 2. Test Execution Records

### Workflow A: New Customer Journey
1. **Storefront Entry:** Opened `http://localhost:5180/`. The landing page loaded instantly without blocking spinner delays (verified via `AppSessionInitializer`).
2. **Registration:** Submitted registration form at `/register` with name, email, phone, and password. Account created with `isEmailVerified: false`.
3. **6-Digit OTP Delivery:** Generated 6-digit numeric OTP with leading zeros preserved (e.g., `004821`). Stored securely as SHA-256 hash. Brevo email notification enqueued.
4. **OTP Verification:** Entered 6 digits in `/verify-email`. Backend validated code hash, marked user verified, and invalidated the OTP.
5. **Login:** Successfully authenticated at `/login`. In-memory access token issued; secure `httpOnly` refresh cookie set.
6. **Portal Access:** Automatically routed to `/dashboard` using `CustomerDashboardLayout` (no storefront footer or landing page components).
7. **Address Setup:** Added delivery address in Ikeja, Lagos. Address saved with validation.
8. **Catalog Discovery:** Navigated to `/shop`. Filtered by category, sorted by "Newest Arrivals", and searched catalog items.
9. **Cart & Wishlist:** Added items to cart; saved favorite to wishlist.
10. **Checkout Session:** Initiated checkout at `/checkout`. Address and shipping method selected. Server calculated accurate shipping and total in NGN.
11. **Order Confirmation:** Placed order; authoritative `Order` document generated in status `pending_payment`.
12. **Paystack Payment:** Redirected to Paystack authorization. Upon simulated success, returned to `/payment/callback`.
13. **Payment Verification:** Backend verified reference directly with Paystack API. Order transitioned to `confirmed` and `paid`.
14. **Tracking & Notifications:** Viewed order tracking timeline in `/account/orders/track/:orderNumber`. In-app notification received with valid action link.

### Workflow B: Returning Customer Journey
1. **Re-Entry & Session Restore:** Opened site with existing refresh cookie. `AppSessionInitializer` silently restored session in <60ms.
2. **Dashboard & History:** Directly navigated to `/dashboard`. Cart and previous orders retrieved immediately.
3. **Logout:** Clicked "Sign Out". Access token cleared in memory; `httpOnly` cookie cleared on backend. Redirected cleanly to `/login`.

