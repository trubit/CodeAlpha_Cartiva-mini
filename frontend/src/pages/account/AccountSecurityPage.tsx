import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Devices as DeviceIcon,
  DeleteOutline as RevokeIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { authService } from '@/services/auth.service';
import { useUiStore } from '@/stores/uiStore';
import type { SessionDto } from '@shared/api.types';

export const AccountSecurityPage: React.FC = () => {
  const { showToast } = useUiStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await authService.getSessions();
      setSessions(res.data || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authService.revokeSession(sessionId);
      showToast('Session revoked', 'info');
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke session';
      showToast(msg, 'error');
    }
  };

  return (
    <Box>
      {/* Change Password Panel */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <KeyIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Change Password
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Ensure your account uses a strong, unique password to prevent unauthorized access
        </Typography>

        <Box component="form" onSubmit={handlePasswordChange} sx={{ maxWidth: 520 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              helperText="Minimum 8 characters"
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={passwordLoading}
                sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, px: 3.5, py: 1.2 }}
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* Active Sessions Panel */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <DeviceIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Active Login Sessions
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Review browsers and devices currently signed in with your credentials
        </Typography>

        {sessions.length > 0 ? (
          <List disablePadding>
            {sessions.map((sess) => (
              <ListItem
                key={sess.id}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
                secondaryAction={
                  !sess.isCurrent ? (
                    <IconButton edge="end" onClick={() => handleRevokeSession(sess.id)} sx={{ color: '#EF4444' }}>
                      <RevokeIcon />
                    </IconButton>
                  ) : (
                    <Chip label="Current Session" size="small" color="primary" sx={{ fontWeight: 700 }} />
                  )
                }
              >
                <ListItemIcon>
                  <DeviceIcon sx={{ color: 'text.primary' }} />
                </ListItemIcon>
                <ListItemText
                  primary={sess.userAgent || 'Web Browser'}
                  primaryTypographyProps={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary' }}
                  secondary={`IP: ${sess.ipAddress || 'Unknown'} • Last Active: ${new Date(sess.lastActiveAt).toLocaleString()}`}
                  secondaryTypographyProps={{ fontSize: '0.78rem', color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {sessionsLoading ? 'Loading active sessions...' : 'No other active sessions detected.'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
