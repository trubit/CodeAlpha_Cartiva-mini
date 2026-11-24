import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Stack,
  Link,
  Alert,
} from '@mui/material';
import {
  LockReset as ResetIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useUiStore } from '@/stores/uiStore';

export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      await authService.forgotPassword({ email: email.trim() });
      setSent(true);
      showToast('Password reset link dispatched to your inbox!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: 'rgba(21, 87, 213, 0.12)',
              color: '#1557D5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <ResetIcon sx={{ fontSize: '1.8rem' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
            Forgot Password?
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Enter your account email and we&apos;ll send a secure password reset link.
          </Typography>
        </Box>

        {sent ? (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              We have sent instructions to <strong>{email}</strong>. Please check your inbox and spam folder.
            </Alert>
            <Button component={RouterLink} to="/login" variant="contained" sx={{ bgcolor: '#1557D5', fontWeight: 700 }}>
              Return to Login
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
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
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: 'text.secondary',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                    '&:hover': { color: '#1557D5', textDecoration: 'underline' },
                  }}
                >
                  <BackIcon fontSize="small" /> Back to Sign In
                </Link>
              </Box>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
