import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Badge,
  Tooltip,
  Chip,
  Typography,
} from '@mui/material';
import {
  NotificationsOutlined as NotificationIcon,
  StorefrontOutlined as StorefrontIcon,
  LogoutOutlined as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { GlobalToast } from '@/components/common/GlobalToast';

/**
 * Cartiva Mini — Authenticated Customer Application Layout
 * Provides a dedicated, distraction-free environment for transactional customer workflows:
 * Checkout, Order Confirmation, Payment Verification, Cart, Wishlist, and Tracking.
 * Strictly excludes public website hero, marketing banners, public About/Contact, and public footer.
 */
export const CustomerAppLayout: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(isAuthenticated);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue client logout even if backend revoke fails
    }
    clearAuth();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      {/* =========================================================================
          1. DEDICATED CUSTOMER PORTAL TOPBAR (NO PUBLIC STOREFRONT HEADER/FOOTER)
          Responsive across mobile (320px–430px), tablet, and desktop
          ========================================================================= */}
      <Box
        component="header"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 1, sm: 1.5 },
          px: { xs: 1.5, sm: 2.5, md: 4 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand / Customer Portal Title */}
        <Box
          component={RouterLink}
          to="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, textDecoration: 'none', minWidth: 0 }}
        >
          <Box
            sx={{
              width: { xs: 32, sm: 38 },
              height: { xs: 32, sm: 38 },
              borderRadius: '10px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: { xs: '1rem', sm: '1.2rem' },
              flexShrink: 0,
            }}
          >
            C
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                lineHeight: 1.1,
                color: 'text.primary',
                fontSize: { xs: '0.88rem', sm: '1rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Cartiva <span style={{ color: '#ea580c' }}>Customer Portal</span>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}
            >
              Secure Checkout & Customer Orders
            </Typography>
          </Box>
        </Box>

        {/* Global Navigation Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, flexShrink: 0 }}>
          {/* Back to Storefront Link */}
          <Button
            component={RouterLink}
            to="/shop"
            size="small"
            variant="outlined"
            startIcon={<StorefrontIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1, sm: 1.5 },
              minWidth: { xs: 'auto', sm: 'auto' },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Storefront</Box>
          </Button>

          {/* Unread Notifications Icon */}
          <Tooltip title="View Notifications">
            <IconButton
              component={RouterLink}
              to="/account/notifications"
              size="small"
              sx={{ color: 'text.secondary', p: { xs: 0.75, sm: 1 } }}
              aria-label="View notifications"
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Info Chip */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, ml: 1 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: '0.82rem' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Chip
                label="Customer"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
              />
            </Box>
          </Box>

          {/* Logout Action */}
          <Button
            onClick={handleLogout}
            size="small"
            color="error"
            variant="contained"
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1, sm: 1.5 },
              minWidth: { xs: 'auto', sm: 'auto' },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Sign Out</Box>
          </Button>
        </Box>
      </Box>

      {/* =========================================================================
          2. DEDICATED APPLICATION CONTENT CONTAINER (NO PUBLIC FOOTER/ABOUT/CONTACT)
          ========================================================================= */}
      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>

      {/* Application Toasts */}
      <GlobalToast />
    </Box>
  );
};
