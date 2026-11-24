import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  TextField,
  IconButton,
} from '@mui/material';
import {
  CheckCircleOutline as SuccessIcon,
  MailOutline as MailIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useSearchParams, useLocation, Link as RouterLink } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useUiStore } from '@/stores/uiStore';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const parts = email.split('@');
  const local = parts[0] ?? '';
  const domain = parts[1] ?? '';
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  const maskedLocal = `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 2, 4))}${local.charAt(local.length - 1)}`;
  return `${maskedLocal}@${domain}`;
}

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { showToast } = useUiStore();

  const initialEmail =
    searchParams.get('email') ||
    (location.state as { email?: string } | undefined)?.email ||
    '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Focus the first input field on mount if email is set
  useEffect(() => {
    if (email && !isEditingEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [email, isEditingEmail]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned.slice(-1);

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg('');

    // If entered a digit and not the last field, advance focus
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasteData.length; i++) {
      const char = pasteData.charAt(i);
      if (char) newDigits[i] = char;
    }
    setDigits(newDigits);
    setErrorMsg('');

    // Focus last filled input or the 6th
    const targetIndex = Math.min(pasteData.length, 5);
    inputRefs.current[targetIndex]?.focus();
  };

  const fullOtp = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please provide a valid email address.');
      setIsEditingEmail(true);
      return;
    }
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await authService.verifyOtp({
        email: email.trim(),
        otp: fullOtp,
        purpose: 'email_verification',
      });
      setSuccess(true);
      showToast('Email verified successfully! You may now sign in.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired verification code.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address to receive a verification code.');
      setIsEditingEmail(true);
      return;
    }
    if (cooldown > 0) return;

    try {
      setResending(true);
      setErrorMsg('');
      const res = await authService.resendOtp({
        email: email.trim(),
        purpose: 'email_verification',
      });
      const waitSec = res?.data?.cooldownSeconds || 60;
      setCooldown(waitSec);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      showToast(res.message || 'A fresh 6-digit verification code has been dispatched.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification code.';
      showToast(msg, 'error');
      setErrorMsg(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ my: 'auto', py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 16px 40px rgba(16, 29, 59, 0.08)',
          textAlign: 'center',
        }}
      >
        {success ? (
          <Box>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
              }}
            >
              <SuccessIcon sx={{ fontSize: '3rem' }} />
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: 'text.primary', mb: 1.5, letterSpacing: '-0.5px' }}
            >
              Email Verified!
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, fontWeight: 500 }}>
              Your account has been verified successfully with your 6-digit code. You now have full access to Cartiva Mini.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              fullWidth
              sx={{
                bgcolor: '#1557D5',
                py: 1.4,
                fontWeight: 700,
                borderRadius: '12px',
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0E42A8' },
              }}
            >
              Sign In to Your Account
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleVerify}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#EFF6FF',
                color: '#1557D5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
              }}
            >
              <MailIcon sx={{ fontSize: '2.4rem' }} />
            </Box>

            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}
            >
              Enter Verification Code
            </Typography>

            {/* Masked Email Header & Edit Switcher */}
            {email && !isEditingEmail ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mb: 3,
                  bgcolor: 'action.hover',
                  py: 0.8,
                  px: 2,
                  borderRadius: '10px',
                  width: 'fit-content',
                  mx: 'auto',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Code sent to <span style={{ color: '#1557D5', fontWeight: 700 }}>{maskEmail(email)}</span>
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setIsEditingEmail(true)}
                  aria-label="Edit email address"
                  sx={{ color: 'text.secondary', p: 0.5 }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 500 }}>
                  Enter the email address you registered with:
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoFocus
                  sx={{ maxWidth: 360, mx: 'auto' }}
                />
                {initialEmail && (
                  <Button
                    size="small"
                    onClick={() => setIsEditingEmail(false)}
                    sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Use original email
                  </Button>
                )}
              </Box>
            )}

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: '10px' }}>
                {errorMsg}
              </Alert>
            )}

            {/* Six-Digit OTP Individual Inputs */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 700,
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.8rem',
                }}
              >
                Your Cartiva Mini Verification Code
              </Typography>

              <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} justifyContent="center">
                {digits.map((digit, idx) => (
                  <Box
                    key={idx}
                    component="input"
                    ref={(el: HTMLInputElement | null) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleDigitChange(idx, e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    sx={{
                      width: { xs: 44, sm: 54 },
                      height: { xs: 54, sm: 64 },
                      textAlign: 'center',
                      fontSize: { xs: '1.4rem', sm: '1.75rem' },
                      fontWeight: 800,
                      fontFamily: "'Courier New', Courier, monospace",
                      bgcolor: digit ? 'action.selected' : 'background.paper',
                      color: 'text.primary',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: digit ? '#1557D5' : 'divider',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: digit ? '0 0 0 3px rgba(21, 87, 213, 0.15)' : 'none',
                      '&:focus': {
                        borderColor: '#1557D5',
                        boxShadow: '0 0 0 4px rgba(21, 87, 213, 0.2)',
                      },
                    }}
                  />
                ))}
              </Stack>

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                Enter the 6-digit numeric code from your inbox. Never share this code.
              </Typography>
            </Box>

            {/* Verify Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || fullOtp.length !== 6 || !email.trim()}
              sx={{
                bgcolor: '#1557D5',
                py: 1.4,
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0E42A8' },
                mb: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
              ) : (
                'Verify Code & Continue'
              )}
            </Button>

            {/* Resend OTP Button */}
            <Button
              variant="outlined"
              fullWidth
              disabled={resending || cooldown > 0 || !email.trim()}
              onClick={handleResend}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: '12px',
                py: 1.1,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {resending ? (
                <CircularProgress size={20} />
              ) : cooldown > 0 ? (
                `Resend Code in ${cooldown}s`
              ) : (
                'Resend Verification Code'
              )}
            </Button>

            <Divider sx={{ my: 3 }} />

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                component={RouterLink}
                to="/"
                variant="text"
                sx={{ borderRadius: '10px', fontWeight: 600, textTransform: 'none' }}
              >
                Back to Home
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                variant="text"
                sx={{
                  color: '#1557D5',
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Already verified? Sign In
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
