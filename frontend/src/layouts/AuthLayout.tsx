import React from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon,
  VerifiedUserOutlined as ShieldIcon,
  LockOutlined as LockIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useUiStore } from '@/stores/uiStore';
import { GlobalToast } from '@/components/common/GlobalToast';

/**
 * Standalone Authentication Layout for Cartiva Mini
 * Used for Login, Registration, Password Recovery, and Email Verification.
 * Deliberately excludes the normal storefront Header, navigation, and Footer.
 */
export const AuthLayout: React.FC = () => {
  const { themeMode, toggleTheme } = useUiStore();
  const isDark = themeMode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? '#0B1120' : '#F5F7FC',
        color: isDark ? '#F8FAFC' : '#101D3B',
        transition: 'background-color 200ms ease, color 200ms ease',
      }}
    >
      {/* =========================================================================
          1. MINIMAL STANDALONE AUTH HEADER
          ========================================================================= */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: { xs: 2, sm: 4 },
          bgcolor: isDark ? '#111827' : '#FFFFFF',
          borderBottom: '1px solid',
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(16, 29, 59, 0.04)',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo & Tagline */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#1557D5',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(21, 87, 213, 0.3)',
              }}
            >
              <CartIcon sx={{ fontSize: '1.35rem' }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.15rem', sm: '1.35rem' },
                  color: isDark ? '#FFFFFF' : '#101D3B',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                }}
              >
                Cartiva <Box component="span" sx={{ color: '#1557D5' }}>Mini</Box>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: isDark ? '#94A3B8' : '#475569',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Shop Smart. Live Better.
              </Typography>
            </Box>
          </Box>

          {/* Right Header Utilities: Return to Store & Theme Mode */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: isDark ? '#F8FAFC' : '#101D3B',
                  border: '1px solid',
                  borderColor: isDark ? '#374151' : '#CBD5E1',
                  p: 0.8,
                }}
                aria-label="Toggle theme mode"
              >
                {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{
                color: isDark ? '#F8FAFC' : '#101D3B',
                fontWeight: 700,
                fontSize: '0.85rem',
                textTransform: 'none',
                borderRadius: '8px',
                px: { xs: 1.5, sm: 2 },
                py: 0.8,
                border: '1px solid',
                borderColor: isDark ? '#374151' : '#CBD5E1',
                bgcolor: isDark ? '#1F2937' : '#FFFFFF',
                '&:hover': {
                  bgcolor: isDark ? '#374151' : '#F1F5F9',
                  borderColor: '#1557D5',
                },
              }}
            >
              Back to Store
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* =========================================================================
          2. STANDALONE AUTHENTICATION BODY (Centered Card Container)
          ========================================================================= */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 2,
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Outlet />
      </Box>

      {/* =========================================================================
          3. MINIMAL STANDALONE AUTH FOOTER (Trust Reassurance & Essential Links)
          ========================================================================= */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          bgcolor: isDark ? '#111827' : '#FFFFFF',
          borderTop: '1px solid',
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          {/* Trust Badges */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="center"
            alignItems="center"
            spacing={{ xs: 1.5, sm: 4 }}
            sx={{ mb: 2, color: isDark ? '#94A3B8' : '#475569', fontSize: '0.82rem' }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center">
              <LockIcon sx={{ fontSize: '1rem', color: '#1557D5' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                256-Bit SSL Bank-Grade Encryption
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <SecurityIcon sx={{ fontSize: '1rem', color: '#10B981' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                PCI-DSS Compliant Paystack Gateway
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <ShieldIcon sx={{ fontSize: '1rem', color: '#FFB900' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Strict Privacy & Fraud Protection
              </Typography>
            </Stack>
          </Stack>

          {/* Legal Links & Copyright */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1.5}
            sx={{
              pt: 2,
              borderTop: '1px solid',
              borderColor: isDark ? '#1F2937' : '#F1F5F9',
              fontSize: '0.78rem',
              color: isDark ? '#94A3B8' : '#475569',
            }}
          >
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#475569' }}>
              © {new Date().getFullYear()} Cartiva Mini. All rights reserved. Registered Nigerian Commerce.
            </Typography>

            <Stack direction="row" spacing={2.5}>
              <Box
                component={RouterLink}
                to="/about"
                sx={{
                  color: isDark ? '#CBD5E1' : '#334155',
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  '&:hover': { color: '#1557D5' },
                }}
              >
                About Us
              </Box>
              <Box
                component={RouterLink}
                to="/support"
                sx={{
                  color: isDark ? '#CBD5E1' : '#334155',
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  '&:hover': { color: '#1557D5' },
                }}
              >
                Customer Support
              </Box>
              <Box
                component={RouterLink}
                to="/contact"
                sx={{
                  color: isDark ? '#CBD5E1' : '#334155',
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  '&:hover': { color: '#1557D5' },
                }}
              >
                Contact
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Global Toast for auth feedback messages */}
      <GlobalToast />
    </Box>
  );
};
