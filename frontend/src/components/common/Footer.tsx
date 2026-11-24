import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Link,
  Stack,
  TextField,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  LocalShippingOutlined as ShippingIcon,
  SecurityOutlined as SecurityIcon,
  SupportAgentOutlined as SupportIcon,
  AutorenewOutlined as ReturnsIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';

export const Footer: React.FC = () => {
  const { showToast } = useUiStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setSubscribed(true);
      showToast('Thank you for subscribing to Cartiva Mini updates!', 'success');
      setEmail('');
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#101D3B',
        color: '#FFFFFF',
        pt: { xs: 8, md: 10 },
        pb: 5,
        mt: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="xl">
        {/* Value Reassurance Bar */}
        <Grid container spacing={3} sx={{ mb: 7, pb: 6, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#FFB900' }}>
                <ShippingIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Nationwide Express
                </Typography>
                <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block' }}>
                  Fast & reliable delivery to your door
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#FFB900' }}>
                <SecurityIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Paystack Secured
                </Typography>
                <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block' }}>
                  Cards, bank transfer & USSD
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#FFB900' }}>
                <SupportIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Dedicated Support
                </Typography>
                <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block' }}>
                  24/7 ticket help & order care
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#FFB900' }}>
                <ReturnsIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Easy Returns
                </Typography>
                <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block' }}>
                  Simple refunds for eligible items
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* Main Footer Links & Newsletter */}
        <Grid container spacing={{ xs: 4, md: 6 }} sx={{ mb: 6 }}>
          {/* Brand Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: '#1557D5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <CartIcon fontSize="small" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                Cartiva <Box component="span" sx={{ color: '#FFB900' }}>Mini</Box>
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 3, maxWidth: 360, lineHeight: 1.7 }}>
              Everything You Need, Just a Click Away. Discover authentic electronics, everyday fashion, home living, and premium lifestyle essentials with trusted Nigerian fulfilment.
            </Typography>

            <Box component="form" onSubmit={handleSubscribe} sx={{ maxWidth: 360 }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#FFFFFF', mb: 1 }}>
                Subscribe for exclusive discounts & updates:
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      color: '#FFFFFF',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: '#FFB900' },
                      '&.Mui-focused fieldset': { borderColor: '#FFB900' },
                    },
                    '& input::placeholder': {
                      color: '#CBD5E1',
                      opacity: 1,
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    bgcolor: '#FFB900',
                    color: '#101D3B',
                    fontWeight: 700,
                    px: 2.5,
                    borderRadius: '8px',
                    '&:hover': { bgcolor: '#E5A600' },
                  }}
                >
                  Join
                </Button>
              </Stack>
              {subscribed && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1, color: '#10B981' }}>
                  <CheckIcon sx={{ fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Subscribed successfully!
                  </Typography>
                </Stack>
              )}
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', mb: 2.5, letterSpacing: '0.8px' }}>
              Shop Catalog
            </Typography>
            <Stack spacing={1.5}>
              <Link component={RouterLink} to="/shop" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                All Products
              </Link>
              <Link component={RouterLink} to="/shop?filter=deals" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Promotions & Deals
              </Link>
              <Link component={RouterLink} to="/shop?category=electronics" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Electronics
              </Link>
              <Link component={RouterLink} to="/shop?category=fashion" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Fashion & Apparel
              </Link>
              <Link component={RouterLink} to="/shop?category=home-living" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Home & Living
              </Link>
            </Stack>
          </Grid>

          {/* Customer Care */}
          <Grid item xs={6} sm={4} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', mb: 2.5, letterSpacing: '0.8px' }}>
              Customer Care
            </Typography>
            <Stack spacing={1.5}>
              <Link component={RouterLink} to="/orders" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Track My Order
              </Link>
              <Link component={RouterLink} to="/account" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                My Account
              </Link>
              <Link component={RouterLink} to="/support" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Customer Support Tickets
              </Link>
              <Link component={RouterLink} to="/cart" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Shopping Cart
              </Link>
              <Link component={RouterLink} to="/wishlist" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Saved Wishlist
              </Link>
            </Stack>
          </Grid>

          {/* Company & Legal */}
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', mb: 2.5, letterSpacing: '0.8px' }}>
              Cartiva Mini
            </Typography>
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Link component={RouterLink} to="/about" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                About Our Company
              </Link>
              <Link component={RouterLink} to="/contact" sx={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 500, '&:hover': { color: '#FFB900' } }}>
                Contact & Warehouse Locations
              </Link>
            </Stack>

            <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block', mb: 1, fontWeight: 700 }}>
              Accepted Payment Gateways:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="Paystack" size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 700 }} />
              <Chip label="Mastercard" size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 700 }} />
              <Chip label="Visa" size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 700 }} />
              <Chip label="Verve" size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 700 }} />
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', my: 4 }} />

        {/* Bottom Bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ fontSize: '0.82rem', color: '#CBD5E1' }}
        >
          <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
            © {new Date().getFullYear()} Cartiva Mini. All rights reserved. Built with precision for Nigerian commerce.
          </Typography>
          <Stack direction="row" spacing={3}>
            <span>Security Audited</span>
            <span>PCI-DSS Compliant Gateway</span>
            <span>256-Bit SSL Encryption</span>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
