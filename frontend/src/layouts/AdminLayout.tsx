import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  ShoppingCartOutlined as OrdersIcon,
  PaymentOutlined as PaymentIcon,
  LocalShippingOutlined as ShippingIcon,
  NotificationsActiveOutlined as NotificationIcon,
  StorefrontOutlined as StorefrontIcon,
  LogoutOutlined as LogoutIcon,
  MenuOutlined as MenuIcon,
  CloseOutlined as CloseIcon,
} from '@mui/icons-material';
import { Outlet, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { GlobalToast } from '@/components/common/GlobalToast';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue client logout even if backend revoke fails
    }
    clearAuth();
    queryClient.clear(); // Purge all cached admin and transactional queries from memory
    navigate('/login', { replace: true });
  };

  const navLinks = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Orders', path: '/admin/orders', icon: <OrdersIcon fontSize="small" /> },
    { label: 'Payments', path: '/admin/payments', icon: <PaymentIcon fontSize="small" /> },
    { label: 'Fulfilment', path: '/admin/fulfilment', icon: <ShippingIcon fontSize="small" /> },
    { label: 'Notifications', path: '/admin/notifications', icon: <NotificationIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      {/* =========================================================================
          1. TOP ADMINISTRATIVE CONTROL BAR (NO STOREFRONT HEADER)
          Fully responsive across mobile (320px–430px), tablet, and desktop
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
        {/* Brand & Administrative Identity + Mobile Hamburger Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
          {/* Mobile Admin Menu Toggle */}
          <IconButton
            onClick={() => setMobileDrawerOpen(true)}
            size="small"
            aria-label="Open admin navigation menu"
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary', mr: 0.5 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

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
              flexShrink: 0,
            }}
          >
            <DashboardIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                lineHeight: 1.1,
                fontSize: { xs: '0.88rem', sm: '1rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Cartiva <span style={{ color: '#ea580c' }}>Control Centre</span>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}
            >
              Centralized E-Commerce Operations & Intelligence
            </Typography>
          </Box>
        </Box>

        {/* Desktop Admin Navigation Links (>= md) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          {navLinks.map((link) => {
            const isDashboard = link.path === '/admin/dashboard';
            const isActive = isDashboard
              ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
              : location.pathname.startsWith(link.path);

            return (
              <Button
                key={link.path}
                component={RouterLink}
                to={link.path}
                size="small"
                variant={isActive ? 'contained' : 'text'}
                color={isActive ? 'primary' : 'inherit'}
                startIcon={link.icon}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  px: 1.5,
                }}
              >
                {link.label}
              </Button>
            );
          })}
        </Box>

        {/* Global Controls & Admin Identity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, flexShrink: 0 }}>
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

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Chip
                label={user?.role?.toUpperCase() || 'ADMIN'}
                size="small"
                color="primary"
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
              />
            </Box>
          </Box>

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
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Logout</Box>
          </Button>
        </Box>
      </Box>

      {/* =========================================================================
          2. MOBILE NAVIGATION DRAWER FOR ADMIN PORTAL
          Provides access to all administrative modules on mobile & tablet viewports
          ========================================================================= */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
            p: 0,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <DashboardIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Control Centre
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setMobileDrawerOpen(false)} aria-label="Close menu">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* User Identity in Drawer */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staff Member
          </Typography>
          <Typography variant="subtitle2" fontWeight={800} color="text.primary" noWrap>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Chip
            label={user?.role?.toUpperCase() || 'ADMIN'}
            size="small"
            color="primary"
            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
          />
        </Box>

        <List disablePadding>
          {navLinks.map((link) => {
            const isDashboard = link.path === '/admin/dashboard';
            const isActive = isDashboard
              ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
              : location.pathname.startsWith(link.path);

            return (
              <ListItem key={link.path} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={link.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  sx={{
                    py: 1.4,
                    px: 2.5,
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    borderLeft: (theme) =>
                      isActive ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary', minWidth: 38 }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 800 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* =========================================================================
          3. MAIN ADMINISTRATIVE CONTENT (NO STOREFRONT HERO OR STOREFRONT BODY)
          ========================================================================= */}
      <Box component="main" sx={{ flexGrow: 1, minHeight: 'calc(100vh - 120px)', width: '100%', minWidth: 0 }}>
        <Outlet />
      </Box>

      {/* =========================================================================
          4. MINIMAL ADMINISTRATIVE FOOTER (NO STOREFRONT FOOTER)
          ========================================================================= */}
      <Box
        component="footer"
        sx={{
          py: 2,
          px: { xs: 2, sm: 4 },
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Cartiva Mini &copy; {new Date().getFullYear()} Administrative Control Centre. Authorized Personnel Only.
        </Typography>
      </Box>

      <GlobalToast />
    </Box>
  );
};
