# Cartiva Mini — Authentication UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Authentication Interfaces Overview & Standalone Layout

Cartiva Mini provides secure, accessible, mobile-responsive authentication workflows backed by the Phase 5 authentication engine (`/api/v1/auth`).

### Standalone Layout Architecture (`AuthLayout.tsx`):
- All authentication views are strictly decoupled from the main storefront shopping layout.
- The standard storefront `Header`, navigation bar, shopping `Footer`, and `CartDrawer` are completely omitted.
- Features a clean, distraction-free header with the Cartiva Mini logo, tagline (*"Everything You Need, Just a Click Away"*), a "Back to store" link, and a theme toggle button.
- Centered high-contrast card container supporting both Light and Dark themes.
- Minimalist footer showcasing SSL encryption and Paystack PCI-DSS Level 1 compliance trust badges.

### Implemented Pages & Supported Routes:
1. **Login Page (`/login`, `/signin`, `/sign-in`):**
   - Clean card layout with Cartiva Mini logo and tagline.
   - Email and password inputs with toggleable password visibility adornment.
   - Direct link to `Forgot Password?`.
   - Remembers redirect destination parameter (`?redirect=...`) to return customer smoothly to checkout or wishlist.
   - Fully accessible via `/login`, `/signin`, and `/sign-in` aliases.
2. **Registration Page (`/register`, `/signup`, `/sign-up`):**
   - Full name (first and last name), email address, phone number, and password confirmation.
   - Terms of Service & Privacy Policy agreement checkbox.
   - Clear validation messaging and feedback.
   - Accessible via `/register`, `/signup`, and `/sign-up` aliases.
3. **Forgot Password (`/forgot-password`):**
   - Simple email submission sending secure reset link.
4. **Reset Password (`/reset-password`):**
   - Token validation via URL query parameters (`?token=...`).
   - Secure new password entry and confirmation with password strength guidance.
5. **Email Verification (`/verify-email`):**
   - Instant token verification on page mount with clear success/failure states and resend verification options.

---

## 2. 404 Route Resolution & Routing Fixes
- **Root Cause of 404:** Previously, only `/login` and `/register` were defined in `frontend/src/routes/index.tsx`; customer navigation to `/signin`, `/sign-in`, `/signup`, or `/sign-up` hit the catch-all wildcard `*` route, displaying `NotFoundPage`.
- **Resolution:** Added explicit route definitions and aliases for all variations under `<Route element={<AuthLayout />}>`.
- **Integration:** Auth endpoints communicate with backend routes `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/verify-email`, `/api/v1/auth/refresh-token`, `/api/v1/auth/logout`.

---

## 3. Security & Token Handling
- Access tokens are securely held in memory in Zustand `authStore` and persisted in session.
- Refresh tokens are transmitted via secure HttpOnly, SameSite cookies, shielding tokens from XSS vectors.
- Error responses never leak database schemas, stack traces, or internal server internals.
