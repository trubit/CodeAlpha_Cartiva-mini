import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { showToast } = useUiStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Strict Open-Redirect Sanitizer: Permits only internal relative paths, blocks protocol-relative and external schemes
  const sanitizeRedirect = (path: unknown): string | null => {
    if (typeof path !== 'string') return null;
    const trimmed = path.trim();
    const safeInternalPathRegex = new RegExp('^/(?!/)[a-zA-Z0-9_\\-./]*$');
    if (safeInternalPathRegex.test(trimmed)) {
      if (trimmed === '/' || trimmed === '/login' || trimmed === '/signin' || trimmed === '/sign-in') {
        return null;
      }
      return trimmed;
    }
    return null;
  };

  // Retrieve destination if redirected from a protected route
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Auto-redirect if already authenticated (honoring preserved destination like /checkout)
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const safeDestination = sanitizeRedirect(stateFrom);
      if (safeDestination) {
        navigate(safeDestination, { replace: true });
        return;
      }
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, stateFrom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in both email and password.', 'warning');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await authService.login({ email: email.trim(), password });
      setAuth(res.data.user, res.data.accessToken);
      showToast(`Welcome back, ${res.data.user.firstName}!`, 'success');

      // Role-based redirection logic with open-redirect defenses
      const role = res.data.user.role;
      const safeDestination = sanitizeRedirect(stateFrom);
      const target =
        safeDestination ||
        (role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard');

      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ my: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 12px 36px rgba(16, 29, 59, 0.08)',
        }}
      >
        {/* Brand Logo & Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              bgcolor: '#1557D5',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 6px 16px rgba(21, 87, 213, 0.3)',
            }}
          >
            <CartIcon sx={{ fontSize: '1.8rem' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
            Sign In to Cartiva Mini
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Access your orders, saved addresses, and express checkout
          </Typography>
        </Box>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {errorMessage && (
            <Alert
              severity={errorMessage.toLowerCase().includes('verify') ? 'warning' : 'error'}
              sx={{ mb: 3, borderRadius: '10px' }}
              action={
                errorMessage.toLowerCase().includes('verify') ? (
                  <Button
                    color="inherit"
                    size="small"
                    component={RouterLink}
                    to={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                    sx={{ fontWeight: 700 }}
                  >
                    Verify Code
                  </Button>
                ) : undefined
              }
            >
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{ color: '#1557D5', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Forgot your password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                bgcolor: '#1557D5',
                color: '#FFFFFF',
                fontWeight: 800,
                py: 1.5,
                borderRadius: '10px',
                boxShadow: '0 6px 18px rgba(21, 87, 213, 0.25)',
                '&:hover': { bgcolor: '#0E42A8' },
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Don&apos;t have an account yet?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{ color: '#1557D5', fontWeight: 800, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Create Account
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
