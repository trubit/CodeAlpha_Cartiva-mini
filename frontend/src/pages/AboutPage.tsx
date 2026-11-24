import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
} from '@mui/material';
import {
  CheckCircle as ValueIcon,
  Storefront as StoreIcon,
  LocalShipping as ShippingIcon,
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 5, md: 8 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Hero Banner */}
        <Box
          sx={{
            borderRadius: '20px',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0F172A' : '#101D3B'),
            border: (theme) => (theme.palette.mode === 'dark' ? '1px solid #1E293B' : 'none'),
            color: '#FFFFFF',
            p: { xs: 4, md: 7 },
            mb: 7,
            textAlign: 'center',
            maxWidth: 1000,
            mx: 'auto',
          }}
        >
          <Typography variant="overline" sx={{ color: '#FFB900 !important', fontWeight: 800, letterSpacing: '1px' }}>
            About Cartiva Mini
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.2rem', md: '3.4rem' },
              lineHeight: 1.1,
              mt: 1,
              mb: 2,
              color: '#FFFFFF !important',
            }}
          >
            Everything You Need,{' '}
            <Box component="span" sx={{ color: '#FFB900 !important' }}>
              Just a Click Away.
            </Box>
          </Typography>
          <Typography variant="body1" sx={{ color: '#E2E8F0 !important', maxWidth: 680, mx: 'auto', fontSize: '1.1rem', lineHeight: 1.7 }}>
            Cartiva Mini is Nigeria&apos;s premier modern e-commerce destination, bringing together genuine international lifestyle brands, authentic electronics, everyday home living, and swift nationwide fulfilment.
          </Typography>
        </Box>

        {/* Mission & Story */}
        <Grid container spacing={5} alignItems="center" sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
              Empowering Everyday Commerce with Trust & Reliability
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.8 }}>
              Founded with the conviction that online shopping should be seamless, dependable, and transparent, Cartiva Mini eliminates common e-commerce friction through strict supplier verification, server-authoritative inventory, and direct partnership with leading logistics carriers.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
              From Lagos to Abuja, Port Harcourt to Kano, we ensure every package delivered represents uncompromised product authenticity, transparent pricing in Nigerian Naira, and customer protection backed by Paystack.
            </Typography>
            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, px: 3.5, py: 1.2 }}
            >
              Explore the Store
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src="https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80"
              alt="Cartiva Mini fulfilment operations"
              sx={{
                width: '100%',
                height: 380,
                objectFit: 'cover',
                borderRadius: '18px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
              }}
            />
          </Grid>
        </Grid>

        {/* Core Pillars */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', textAlign: 'center', mb: 4 }}>
            Our Commitments to You
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  <StoreIcon sx={{ fontSize: '2.2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  100% Genuine Items
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No counterfeit products. Every SKU is vetted and verified before dispatch.
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  <ShippingIcon sx={{ fontSize: '2.2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Verified Dispatch
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Real-time milestone tracking from dispatch to final customer handover.
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  <SecurityIcon sx={{ fontSize: '2.2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Paystack Escrow
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Bank-level security protecting your card numbers and financial transactions.
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  <ValueIcon sx={{ fontSize: '2.2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Customer First
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Fast resolutions, dedicated support tickets, and an easy return policy.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};
