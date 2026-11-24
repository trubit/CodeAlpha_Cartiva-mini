import React from 'react';
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
} from '@mui/icons-material';
import { Outlet, useLocation, Link as RouterLink, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

export const AccountLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(isAuthenticated);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { label: 'Overview', path: '/account', icon: <OverviewIcon /> },
    { label: 'Notifications', path: '/account/notifications', icon: <NotificationIcon />, badge: unreadCount },
    { label: 'Communication Preferences', path: '/account/notifications/preferences', icon: <PreferencesIcon /> },
    { label: 'Profile Settings', path: '/account/profile', icon: <ProfileIcon /> },
    { label: 'My Orders', path: '/orders', icon: <OrdersIcon /> },
    { label: 'Delivery Addresses', path: '/account/addresses', icon: <AddressIcon /> },
    { label: 'Saved Wishlist', path: '/wishlist', icon: <WishlistIcon /> },
    { label: 'Account Security', path: '/account/security', icon: <SecurityIcon /> },
    { label: 'Support Tickets', path: '/account/support', icon: <SupportIcon /> },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Account Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Home / Customer Portal
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', mt: 0.5 }}>
            Customer Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Logged in as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Sidebar Menu */}
          <Grid item xs={12} md={3.5} lg={3}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'hidden',
                position: 'sticky',
                top: 90,
              }}
            >
              <List disablePadding>
                {navItems.map((item) => {
                  const isActive =
                    item.path === '/account'
                      ? location.pathname === '/account'
                      : location.pathname.startsWith(item.path);

                  return (
                    <ListItem key={item.path} disablePadding>
                      <ListItemButton
                        component={RouterLink}
                        to={item.path}
                        sx={{
                          py: 1.5,
                          px: 2.5,
                          bgcolor: isActive ? 'action.selected' : 'transparent',
                          borderLeft: (theme) =>
                            isActive ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                          color: isActive ? 'primary.main' : 'text.primary',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 800 : 600,
                            fontSize: '0.92rem',
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
            </Paper>
          </Grid>

          {/* Main Account Content Column */}
          <Grid item xs={12} md={8.5} lg={9}>
            <Outlet />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
