import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { CustomerDashboardLayout } from '@/layouts/CustomerDashboardLayout';
import { CustomerAppLayout } from '@/layouts/CustomerAppLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { SmartHomeRoute } from '@/components/common/SmartHomeRoute';

// ============================================================================
// Route-Level Code Splitting (React.lazy)
// Reduces initial bundle size and defers loading of administrative and portal
// views until demanded by authenticated navigation.
// ============================================================================
const ShopPage = lazy(() => import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const ProductDetailPage = lazy(() =>
  import('@/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const SupportPage = lazy(() => import('@/pages/SupportPage').then((m) => ({ default: m.SupportPage })));

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);

const AccountOverviewPage = lazy(() =>
  import('@/pages/account/AccountOverviewPage').then((m) => ({ default: m.AccountOverviewPage }))
);
const AccountProfilePage = lazy(() =>
  import('@/pages/account/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage }))
);
const AccountAddressesPage = lazy(() =>
  import('@/pages/account/AccountAddressesPage').then((m) => ({ default: m.AccountAddressesPage }))
);
const AccountSecurityPage = lazy(() =>
  import('@/pages/account/AccountSecurityPage').then((m) => ({ default: m.AccountSecurityPage }))
);
const AccountSupportPage = lazy(() =>
  import('@/pages/account/AccountSupportPage').then((m) => ({ default: m.AccountSupportPage }))
);
const AccountTicketDetailPage = lazy(() =>
  import('@/pages/account/AccountTicketDetailPage').then((m) => ({ default: m.AccountTicketDetailPage }))
);
const AccountNotificationsPage = lazy(() =>
  import('@/pages/account/AccountNotificationsPage').then((m) => ({ default: m.AccountNotificationsPage }))
);
const AccountNotificationPreferencesPage = lazy(() =>
  import('@/pages/account/AccountNotificationPreferencesPage').then((m) => ({
    default: m.AccountNotificationPreferencesPage,
  }))
);

const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() =>
  import('@/pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const OrderTrackingPage = lazy(() =>
  import('@/pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage }))
);
const PaymentReviewPage = lazy(() =>
  import('@/pages/payment/PaymentReviewPage').then((m) => ({ default: m.PaymentReviewPage }))
);
const PaymentVerifyPage = lazy(() =>
  import('@/pages/payment/PaymentVerifyPage').then((m) => ({ default: m.PaymentVerifyPage }))
);
const PaymentHistoryPage = lazy(() =>
  import('@/pages/payment/PaymentHistoryPage').then((m) => ({ default: m.PaymentHistoryPage }))
);

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminPaymentsPage = lazy(() =>
  import('@/pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage }))
);
const AdminFulfilmentPage = lazy(() =>
  import('@/pages/admin/AdminFulfilmentPage').then((m) => ({ default: m.AdminFulfilmentPage }))
);
const AdminNotificationsPage = lazy(() =>
  import('@/pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage }))
);

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * Route Transition Fallback Indicator with Safety Timeout
 */
const RouteTransitionLoader: React.FC = () => {
  const [showReloadHint, setShowReloadHint] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowReloadHint(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        width: '100%',
        gap: 2,
      }}
    >
      <CircularProgress size={36} thickness={4} sx={{ color: 'primary.main' }} />
      {showReloadHint && (
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 1 }}>
            Connecting to storefront services...
          </Box>
          <Box
            component="button"
            onClick={() => window.location.reload()}
            sx={{
              background: 'none',
              border: 'none',
              color: 'primary.main',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Refresh Page
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<RouteTransitionLoader />}>
        <Routes>
          {/* =========================================================================
              1. STANDALONE AUTHENTICATION ROUTES (No Storefront Header or Footer)
              Canonical paths and aliases (/signin, /sign-in, /signup, /sign-up)
              ========================================================================= */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signin" element={<LoginPage />} />
            <Route path="sign-in" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="signup" element={<RegisterPage />} />
            <Route path="sign-up" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
          </Route>

          {/* =========================================================================
              2. PUBLIC STOREFRONT LAYOUT (With Header, Navigation, Cart Drawer, Footer)
              ========================================================================= */}
          <Route path="/" element={<RootLayout />}>
            <Route index element={<SmartHomeRoute />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="products" element={<Navigate to="/shop" replace />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="support" element={<SupportPage />} />

            {/* Public 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* =========================================================================
              3. AUTHENTICATED CUSTOMER CHECKOUT & TRANSACTIONAL FLOW
              Dedicated Customer Portal Topbar, NO Public Storefront Hero, About, Contact, or Footer
              Protected by Role-Based Guard (Customer, Staff, Admin)
              ========================================================================= */}
          <Route element={<ProtectedRoute allowedRoles={['customer', 'staff', 'admin']} />}>
            <Route element={<CustomerAppLayout />}>
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="checkout/confirmation/:orderNumber" element={<OrderConfirmationPage />} />
              <Route path="checkout/payment/:orderNumber" element={<PaymentReviewPage />} />
              <Route path="payment/callback" element={<PaymentVerifyPage />} />
              <Route path="payment/verify/:reference" element={<PaymentVerifyPage />} />
            </Route>
          </Route>

          {/* =========================================================================
              4. CUSTOMER DASHBOARD (Dedicated Portal Topbar + Sidebar, NO Storefront Header/Footer)
              Accessible to authenticated customers and shoppers
              ========================================================================= */}
          <Route element={<ProtectedRoute allowedRoles={['customer', 'staff', 'admin']} />}>
            <Route path="account" element={<CustomerDashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="overview" element={<Navigate to="/dashboard" replace />} />
              <Route path="profile" element={<AccountProfilePage />} />
              <Route path="addresses" element={<AccountAddressesPage />} />
              <Route path="security" element={<AccountSecurityPage />} />
              <Route path="support" element={<AccountSupportPage />} />
              <Route path="support/ticket/:ticketId" element={<AccountTicketDetailPage />} />
              <Route path="notifications" element={<AccountNotificationsPage />} />
              <Route path="notifications/preferences" element={<AccountNotificationPreferencesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="orders/:orderId/tracking" element={<OrderTrackingPage />} />
              <Route path="orders/:orderId/track" element={<OrderTrackingPage />} />
              <Route path="orders/track/:orderId" element={<OrderTrackingPage />} />
              <Route path="payments" element={<PaymentHistoryPage />} />
            </Route>

            {/* Canonical dashboard paths */}
            <Route path="dashboard" element={<CustomerDashboardLayout />}>
              <Route index element={<AccountOverviewPage />} />
            </Route>
            <Route path="orders" element={<CustomerDashboardLayout />}>
              <Route index element={<OrdersPage />} />
              <Route path=":orderId" element={<OrderDetailPage />} />
              <Route path=":orderId/tracking" element={<OrderTrackingPage />} />
              <Route path=":orderId/track" element={<OrderTrackingPage />} />
              <Route path="track/:orderId" element={<OrderTrackingPage />} />
            </Route>
          </Route>

          {/* =========================================================================
              5. ADMINISTRATIVE PORTAL (Dedicated Admin Topbar + Sidebar, NO Storefront Header/Footer)
              Accessible exclusively to authenticated platform administrators
              ========================================================================= */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="fulfilment" element={<AdminFulfilmentPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
