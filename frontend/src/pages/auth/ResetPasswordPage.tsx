import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useUiStore } from '@/stores/uiStore';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useUiStore();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('Missing reset token in URL.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword({ token, password, confirmPassword });
      showToast('Password reset successfully! Please sign in with your new password.', 'success');
      navigate('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
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
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, textAlign: 'center', letterSpacing: '-0.5px' }}>
          Choose a New Password
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center', fontWeight: 500 }}>
          Enter your new secure password below to regain account access.
        </Typography>

        {!token ? (
          <Alert severity="error">
            Invalid or missing password reset link. Please request a new one.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  bgcolor: '#1557D5',
                  py: 1.5,
                  fontWeight: 800,
                  borderRadius: '10px',
                  boxShadow: '0 6px 18px rgba(21, 87, 213, 0.25)',
                  '&:hover': { bgcolor: '#0E42A8' },
                }}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
