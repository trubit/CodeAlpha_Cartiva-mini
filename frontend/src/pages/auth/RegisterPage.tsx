import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Link,
  Divider,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useUiStore } from '@/stores/uiStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useUiStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    if (!agreeTerms) {
      showToast('Please accept the Terms of Service to register.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
      });

      showToast('Account created! Please enter the 6-digit code sent to your email.', 'success');
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, {
        state: { email: email.trim() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
            Create Your Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Join Cartiva Mini for seamless shopping and order management
          </Typography>
        </Box>

        {/* Registration Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number (Optional)"
                placeholder="+2348012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="At least 8 characters with a mix of letters and numbers"
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    I agree to the{' '}
                    <Link component={RouterLink} to="/terms" sx={{ color: '#1557D5', fontWeight: 700 }}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link component={RouterLink} to="/privacy" sx={{ color: '#1557D5', fontWeight: 700 }}>
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12}>
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
                {loading ? 'Creating Account...' : 'Register'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#1557D5', fontWeight: 800, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
