import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  IconButton,
  Badge,
  Tooltip,
  Drawer,
} from '@mui/material';
import {
  DashboardOutlined as OverviewIcon,
  PersonOutline as ProfileIcon,
  ShoppingBagOutlined as OrdersIcon,
  LocationOnOutlined as AddressIcon,
  SecurityOutlined as SecurityIcon,
  SupportAgentOutlined as SupportIcon,
  FavoriteBorderOutlined as WishlistIcon,
  NotificationsOutlined as NotificationIcon,
  TuneOutlined as PreferencesIcon,
  StorefrontOutlined as StorefrontIcon,
  LogoutOutlined as LogoutIcon,
  MenuOutlined as MenuIcon,
  CloseOutlined as CloseIcon,
} from '@mui/icons-material';
import { Outlet, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { GlobalToast } from '@/components/common/GlobalToast';

export const CustomerDashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(isAuthenticated);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue client logout even if backend revoke fails
    }
    clearAuth();
    queryClient.clear(); // Complete in-memory cache purge of customer data
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: <OverviewIcon /> },
    { label: 'My Orders', path: '/orders', icon: <OrdersIcon /> },
    { label: 'Notifications', path: '/account/notifications', icon: <NotificationIcon />, badge: unreadCount },
    { label: 'My Profile', path: '/account/profile', icon: <ProfileIcon /> },
    { label: 'Delivery Addresses', path: '/account/addresses', icon: <AddressIcon /> },
    { label: 'Notification Settings', path: '/account/notifications/preferences', icon: <PreferencesIcon /> },
    { label: 'Wishlist', path: '/wishlist', icon: <WishlistIcon /> },
    { label: 'Account Security', path: '/account/security', icon: <SecurityIcon /> },
    { label: 'Support Tickets', path: '/account/support', icon: <SupportIcon /> },
  ];

  const renderNavList = (onItemClick?: () => void) => (
    <List disablePadding>
      {navItems.map((item) => {
        const isOverview = item.path === '/dashboard';
        const isActive = isOverview
          ? location.pathname === '/dashboard' || location.pathname === '/account'
          : location.pathname.startsWith(item.path);

        return (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              onClick={onItemClick}
              sx={{
                py: 1.4,
                px: 2.5,
                bgcolor: isActive ? 'action.selected' : 'transparent',
                borderLeft: (theme) =>
                  isActive ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                color: isActive ? 'primary.main' : 'text.primary',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary', minWidth: 38 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? 800 : 500,
                  fontSize: '0.9rem',
                }}
              />
              {Boolean(item.badge && item.badge > 0) && (
                <Chip
                  label={item.badge}
                  size="small"
                  color="error"
                  sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700 }}
                />
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      {/* =========================================================================
          1. DEDICATED CUSTOMER PORTAL TOPBAR (NO STOREFRONT HEADER)
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
        {/* Brand / Customer Portal Title + Mobile Menu Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
          {/* Mobile Menu Button (Hamburger) */}
          <IconButton
            onClick={() => setMobileDrawerOpen(true)}
            size="small"
            aria-label="Open customer menu"
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
              Personal Account, Orders & Preferences
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

          {/* User Info Chip (Desktop only) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, ml: 0.5 }}>
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
          2. MOBILE NAVIGATION DRAWER FOR CUSTOMER PORTAL
          Allows seamless navigation on mobile & tablet viewports
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
                fontWeight: 900,
              }}
            >
              C
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Portal Navigation
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setMobileDrawerOpen(false)} aria-label="Close menu">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* User Snapshot in Mobile Drawer */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Logged in as
          </Typography>
          <Typography variant="subtitle2" fontWeight={800} color="text.primary" noWrap>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email}
          </Typography>
        </Box>

        {renderNavList(() => setMobileDrawerOpen(false))}
      </Drawer>

      {/* =========================================================================
          3. MAIN CUSTOMER DASHBOARD BODY WITH SIDEBAR
          ========================================================================= */}
      <Box sx={{ flexGrow: 1, py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2, md: 0 } }}>
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          {/* Quick Horizontal Scroll Nav Chips for Mobile & Tablet */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              overflowX: 'auto',
              gap: 1,
              pb: 1.5,
              mb: 2.5,
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {navItems.map((item) => {
              const isOverview = item.path === '/dashboard';
              const isActive = isOverview
                ? location.pathname === '/dashboard' || location.pathname === '/account'
                : location.pathname.startsWith(item.path);

              return (
                <Chip
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  clickable
                  color={isActive ? 'primary' : 'default'}
                  variant={isActive ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.8rem',
                    py: 1.8,
                    borderRadius: '20px',
                    '& .MuiChip-icon': {
                      fontSize: '1rem',
                      color: isActive ? '#fff' : 'text.secondary',
                    },
                  }}
                />
              );
            })}
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3, md: 3.5 }}>
            {/* Left Sidebar Menu (Visible on Desktop >= md) */}
            <Grid item xs={12} md={3.2} lg={2.8} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  position: 'sticky',
                  top: 88,
                }}
              >
                {/* Account Greeting Snippet */}
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Logged in as
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary" noWrap>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {user?.email}
                  </Typography>
                </Box>

                {renderNavList()}
              </Paper>
            </Grid>

            {/* Right Main Content Area (Full width on mobile/tablet) */}
            <Grid item xs={12} md={8.8} lg={9.2} sx={{ minWidth: 0, width: '100%' }}>
              <Outlet />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* =========================================================================
          4. MINIMAL CUSTOMER PORTAL FOOTER (NO STOREFRONT FOOTER)
          ========================================================================= */}
      <Box
        component="footer"
        sx={{
          py: 2.5,
          px: 3,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Cartiva Mini &copy; {new Date().getFullYear()}. Protected Customer Dashboard. All rights reserved.
        </Typography>
      </Box>

      <GlobalToast />
    </Box>
  );
};
