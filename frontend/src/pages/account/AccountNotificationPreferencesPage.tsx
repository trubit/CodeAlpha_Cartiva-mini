import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  TuneOutlined as PreferencesIcon,
  ShieldOutlined as ShieldIcon,
  EmailOutlined as EmailIcon,
  NotificationsActiveOutlined as InAppIcon,
  SmsOutlined as SmsIcon,
  SendOutlined as PushIcon,
  SaveOutlined as SaveIcon,
} from '@mui/icons-material';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotifications';
import { useUiStore } from '@/stores/uiStore';

export const AccountNotificationPreferencesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const { data: prefs, isLoading, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [inAppAlerts, setInAppAlerts] = useState(true);

  // Sync state when preferences are loaded
  useEffect(() => {
    if (prefs) {
      setPromotionalEmails(prefs.promotionalEmails);
      setNewsletter(prefs.newsletter);
      setInAppAlerts(prefs.inAppAlerts);
    }
  }, [prefs]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        promotionalEmails,
        newsletter,
        inAppAlerts,
      });
      showToast('Notification preferences saved successfully.', 'success');
    } catch {
      showToast('Failed to save preferences. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load your communication preferences. Please refresh the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <PreferencesIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Communication & Notification Preferences
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Control how Cartiva Mini communicates with you. Manage optional promotional messages while ensuring essential account and order updates are delivered safely.
        </Typography>
      </Paper>

      {/* Mandatory Transactional Notice Alert */}
      <Alert
        severity="info"
        icon={<ShieldIcon />}
        sx={{
          mb: 3,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'info.light',
          '& .MuiAlert-message': { lineHeight: 1.6 },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
          Mandatory Transactional & Security Communications
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.88rem' }}>
          For your account safety and order fulfillment, essential operational emails (such as order confirmation receipts, payment verification notices, shipment tracking updates, and password reset instructions) are mandatory and cannot be disabled.
        </Typography>
      </Alert>

      {/* Communication Channels */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
          Email Communications
        </Typography>

        {/* 1. Transactional Emails (Locked) */}
        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <EmailIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Orders & Account Security Notifications
                </Typography>
                <Chip
                  label="Required"
                  size="small"
                  sx={{ bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.7rem' }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Receipts, payment confirmations, shipment tracking updates, and account security alerts.
              </Typography>
            </Box>
          </Box>
          <Switch checked disabled />
        </Box>

        {/* 2. Promotional Emails */}
        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <EmailIcon sx={{ color: 'primary.main', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.3 }}>
                Promotional Offers & Special Deals
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Receive curated discounts, flash sales, and early access to seasonal commercial events.
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={promotionalEmails}
            onChange={(e) => setPromotionalEmails(e.target.checked)}
            color="primary"
          />
        </Box>

        {/* 3. Newsletter */}
        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <EmailIcon sx={{ color: 'primary.main', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.3 }}>
                Cartiva Mini Lifestyle Newsletter
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Curated trends, new product arrivals, and stories from our featured brands.
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            color="primary"
          />
        </Box>

        {/* 4. In-App Notifications */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 4, mb: 2 }}>
          Platform & In-App Alerts
        </Typography>

        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <InAppIcon sx={{ color: 'primary.main', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.3 }}>
                In-App Notification Centre Alerts
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Display notification badges and interactive popover alerts in your navigation header.
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={inAppAlerts}
            onChange={(e) => setInAppAlerts(e.target.checked)}
            color="primary"
          />
        </Box>

        {/* Future Channel Boundaries: SMS & Push */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 4, mb: 1 }}>
          Additional Communication Channels
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          Boundary interfaces prepared in Phase 17 for future multi-channel expansion.
        </Typography>

        {/* SMS Boundary */}
        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            opacity: 0.65,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <SmsIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  SMS Dispatch
                </Typography>
                <Chip label="Channel Unavailable" size="small" sx={{ fontSize: '0.68rem' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Direct mobile SMS notifications are currently unavailable pending approved gateway configuration.
              </Typography>
            </Box>
          </Box>
          <Switch checked={false} disabled />
        </Box>

        {/* Push Boundary */}
        <Box
          sx={{
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.65,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 2 }}>
            <PushIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Web Push Notifications
                </Typography>
                <Chip label="Channel Unavailable" size="small" sx={{ fontSize: '0.68rem' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Browser web push alerts are currently unavailable pending server VAPID key configuration.
              </Typography>
            </Box>
          </Box>
          <Switch checked={false} disabled />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={updateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={updateMutation.isPending}
            sx={{
              px: 4,
              py: 1.2,
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(21, 87, 213, 0.25)',
            }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
