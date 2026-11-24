import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  NotificationsOutlined as NotificationIcon,
  DoneAll as MarkAllReadIcon,
  DeleteOutline as DeleteIcon,
  CheckCircleOutline as CheckIcon,
  LocalShippingOutlined as ShippingIcon,
  PaymentOutlined as PaymentIcon,
  SecurityOutlined as SecurityIcon,
  SupportAgentOutlined as SupportIcon,
  Inventory2Outlined as OrderIcon,
  OpenInNew as ExternalLinkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { NotificationType } from '@shared/enums';
import type { NotificationDto } from '@shared/api.types';

export const AccountNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState<'all' | 'unread' | 'orders' | 'security'>('all');
  const [page, setPage] = useState(1);

  // Map tabs to query parameters
  const queryParams = {
    page,
    limit: 10,
    ...(tabValue === 'unread' ? { isRead: false } : {}),
    ...(tabValue === 'orders' ? { type: NotificationType.ORDER_STATUS } : {}),
    ...(tabValue === 'security' ? { type: NotificationType.SECURITY_ALERT } : {}),
  };

  const { data, isLoading, error } = useNotifications(queryParams);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_STATUS:
      case NotificationType.ORDER_PROCESSING:
        return <OrderIcon sx={{ color: '#1557D5' }} />;
      case NotificationType.ORDER_DISPATCHED:
      case NotificationType.DELIVERY_UPDATE:
      case NotificationType.DELIVERY_COMPLETED:
        return <ShippingIcon sx={{ color: '#059669' }} />;
      case NotificationType.PAYMENT_SUCCESS:
      case NotificationType.PAYMENT_FAILED:
      case NotificationType.REFUND_UPDATE:
        return <PaymentIcon sx={{ color: '#D97706' }} />;
      case NotificationType.PASSWORD_CHANGED:
      case NotificationType.SECURITY_ALERT:
      case NotificationType.PASSWORD_RESET:
        return <SecurityIcon sx={{ color: '#DC2626' }} />;
      case NotificationType.SUPPORT_RESPONSE:
        return <SupportIcon sx={{ color: '#7C3AED' }} />;
      default:
        return <NotificationIcon sx={{ color: '#64748B' }} />;
    }
  };

  const handleNotificationClick = (item: NotificationDto) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    if (!item.actionUrl) return;

    try {
      // Security guard: disallow dangerous script execution protocols
      const trimmedUrl = item.actionUrl.trim();
      const lower = trimmedUrl.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return;
      }

      // Handle absolute vs relative URLs safely
      if (/^https?:\/\//i.test(trimmedUrl)) {
        const parsed = new URL(trimmedUrl, window.location.origin);
        if (parsed.origin === window.location.origin) {
          let internalPath = parsed.pathname + parsed.search + parsed.hash;
          if (internalPath === '/products' || internalPath === '/products/') {
            internalPath = '/shop';
          }
          navigate(internalPath);
        } else {
          // Secure external navigation with rel=noopener,noreferrer
          window.open(parsed.href, '_blank', 'noopener,noreferrer');
        }
      } else {
        let targetPath = trimmedUrl;
        if (targetPath === '/products' || targetPath === '/products/') {
          targetPath = '/shop';
        }
        navigate(targetPath);
      }
    } catch {
      if (item.actionUrl.startsWith('/')) {
        navigate(item.actionUrl === '/products' ? '/shop' : item.actionUrl);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Notification Centre
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} Unread`}
                color="error"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Real-time updates regarding your purchases, shipment delivery progress, and account safety.
          </Typography>
        </Box>

        {unreadCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<MarkAllReadIcon />}
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Mark all read
          </Button>
        )}
      </Paper>

      {/* Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_e, val) => {
            setTabValue(val);
            setPage(1);
          }}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab value="all" label="All Notifications" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab
            value="unread"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Unread</span>
                {unreadCount > 0 && (
                  <Chip
                    label={unreadCount}
                    size="small"
                    color="error"
                    sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                )}
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab value="orders" label="Orders & Fulfilment" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab value="security" label="Account Security" sx={{ fontWeight: 600, textTransform: 'none' }} />
        </Tabs>
      </Paper>

      {/* Main Content Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load notifications. Please try refreshing the page.
        </Alert>
      ) : !data?.items || data.items.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            px: 3,
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <CheckIcon sx={{ fontSize: 56, color: '#10B981', mb: 2, opacity: 0.85 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            You&apos;re all caught up!
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {tabValue === 'unread'
              ? 'No unread notifications. We will alert you here as soon as there are updates on your orders or account.'
              : 'There are no notifications in this view at this time.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.items.map((item) => (
            <Paper
              key={item.id}
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: '14px',
                border: '1px solid',
                borderColor: !item.isRead ? 'primary.main' : 'divider',
                bgcolor: !item.isRead ? 'rgba(21, 87, 213, 0.03)' : 'background.paper',
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  borderColor: 'primary.light',
                },
              }}
            >
              {/* Category Icon */}
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getNotificationIcon(item.type)}
              </Box>

              {/* Notification Body */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: !item.isRead ? 800 : 600,
                        color: 'text.primary',
                        fontSize: { xs: '0.92rem', sm: '1rem' },
                      }}
                    >
                      {item.title}
                    </Typography>
                    {!item.isRead && (
                      <Chip
                        label="New"
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                      />
                    )}
                  </Box>

                  <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mb: item.actionUrl ? 1.5 : 0, lineHeight: 1.55 }}
                >
                  {item.message}
                </Typography>

                {item.actionUrl && (
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<ExternalLinkIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleNotificationClick(item)}
                    sx={{
                      p: 0,
                      fontWeight: 700,
                      textTransform: 'none',
                      color: 'primary.main',
                      minWidth: 'auto',
                      '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' },
                    }}
                  >
                    View Details
                  </Button>
                )}
              </Box>

              {/* Actions: Mark read / Delete */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {!item.isRead && (
                  <Tooltip title="Mark as read">
                    <IconButton
                      size="small"
                      onClick={() => markAsReadMutation.mutate(item.id)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(item.id)}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          ))}

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.meta.totalPages}
                page={page}
                onChange={(_e, val) => setPage(val)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
