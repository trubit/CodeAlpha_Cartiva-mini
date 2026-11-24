import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Chip,
  Skeleton,
  Stack,
} from '@mui/material';
import {
  ShoppingBagOutlined as OrdersIcon,
  LocationOnOutlined as AddressIcon,
  FavoriteBorderOutlined as WishlistIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMyOrders } from '@/hooks/useOrders';
import { useAddresses } from '@/hooks/useAddresses';
import { userService } from '@/services/user.service';
import type { CustomerDashboardSummaryDto, OrderListItemDto } from '@shared/api.types';

export const AccountOverviewPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: ordersData, isLoading: ordersLoading } = useMyOrders(1, 3);
  const { data: addresses = [] } = useAddresses();
  const [dashboardSummary, setDashboardSummary] = useState<CustomerDashboardSummaryDto | null>(null);

  useEffect(() => {
    userService
      .getDashboardSummary()
      .then(setDashboardSummary)
      .catch(() => {});
  }, []);

  const orders = ordersData?.data || [];
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <Box>
      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          borderRadius: '16px',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#111827' : '#FFFFFF'),
          border: '1px solid',
          borderColor: (theme) => (theme.palette.mode === 'dark' ? '#1F2937' : '#E2E8F0'),
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            mb: 1,
            fontSize: { xs: '1.5rem', md: '1.9rem' },
            color: (theme) => (theme.palette.mode === 'dark' ? '#F8FAFC' : '#101D3B'),
          }}
        >
          Welcome back, {user?.firstName || 'Valued Customer'}!
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: (theme) => (theme.palette.mode === 'dark' ? '#CBD5E1' : '#475569'),
            maxWidth: 500,
          }}
        >
          Manage your active orders, edit shipping addresses, and review your account security settings.
        </Typography>
      </Paper>

      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'action.hover', color: 'primary.main' }}>
                <OrdersIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary' }}>
                  {dashboardSummary?.orderCount ?? orders.length}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Total Orders Placed
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'action.hover', color: '#10B981' }}>
                <AddressIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary' }}>
                  {addresses.length}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Saved Addresses
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'action.hover', color: '#FFB900' }}>
                <WishlistIcon />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary' }}>
                  {dashboardSummary?.wishlistCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Wishlisted Items
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Orders Section */}
      <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Recent Orders
          </Typography>
          <Button component={RouterLink} to="/orders" endIcon={<ArrowForwardIcon />} sx={{ color: 'primary.main', fontWeight: 700 }}>
            View All Orders
          </Button>
        </Box>

        {ordersLoading ? (
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: '12px' }} />
        ) : orders.length > 0 ? (
          <Stack spacing={2}>
            {orders.map((ord: OrderListItemDto) => (
              <Box
                key={ord.id}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Order #{ord.orderNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Placed on {new Date(ord.createdAt).toLocaleDateString()} • {ord.itemCount || 1} items
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    ₦{(ord.totalAmount || 0).toLocaleString()}
                  </Typography>
                  <Chip label={ord.orderStatus} size="small" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                  <Button
                    component={RouterLink}
                    to={`/orders/${ord.orderNumber}`}
                    variant="outlined"
                    size="small"
                    sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 700 }}
                  >
                    Details
                  </Button>
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
            You haven&apos;t placed any orders yet. Start exploring our catalog to make your first purchase!
          </Typography>
        )}
      </Paper>

      {/* Primary Delivery Address */}
      <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Default Delivery Address
          </Typography>
          <Button component={RouterLink} to="/account/addresses" sx={{ color: 'primary.main', fontWeight: 700 }}>
            Manage Addresses →
          </Button>
        </Box>

        {defaultAddress ? (
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {defaultAddress.recipientName} ({defaultAddress.phone})
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {defaultAddress.streetAddress}, {defaultAddress.city}, {defaultAddress.state}, {defaultAddress.country}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No shipping addresses saved. Add a default delivery address to speed up checkout.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
