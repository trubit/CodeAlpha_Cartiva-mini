import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Pagination,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  NotificationsActiveOutlined as NotificationIcon,
  ReplayOutlined as RetryIcon,
  SearchOutlined as SearchIcon,
  CheckCircleOutline as SentIcon,
  ErrorOutline as FailedIcon,
  ScheduleOutlined as PendingIcon,
  MarkEmailReadOutlined as TemplateIcon,
} from '@mui/icons-material';
import {
  useAdminNotifications,
  useAdminRetryNotification,
  useAdminNotificationTemplates,
} from '@/hooks/useNotifications';
import {
  NotificationDeliveryStatus,
  NotificationChannel,
} from '@shared/enums';
import { useUiStore } from '@/stores/uiStore';
import type { AdminNotificationOutboxDto, NotificationTemplateDto } from '@shared/api.types';

export const AdminNotificationsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [currentTab, setCurrentTab] = useState<'outbox' | 'templates'>('outbox');

  // Filter states
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryParams = {
    page,
    limit: 15,
    ...(statusFilter !== 'all' ? { status: statusFilter as NotificationDeliveryStatus } : {}),
    ...(channelFilter !== 'all' ? { channel: channelFilter as NotificationChannel } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  };

  const { data: outboxData, isLoading, error } = useAdminNotifications(
    queryParams,
    currentTab === 'outbox'
  );
  const { data: templates = [], isLoading: isTemplatesLoading } = useAdminNotificationTemplates(
    currentTab === 'templates'
  );
  const retryMutation = useAdminRetryNotification();

  const handleRetry = async (notificationId: string) => {
    try {
      await retryMutation.mutateAsync(notificationId);
      showToast('Notification retry scheduled successfully.', 'success');
    } catch {
      showToast('Failed to schedule notification retry.', 'error');
    }
  };

  const getStatusChip = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case NotificationDeliveryStatus.SENT:
      case NotificationDeliveryStatus.DELIVERED:
        return (
          <Chip
            icon={<SentIcon sx={{ fontSize: '14px !important' }} />}
            label={status.toUpperCase()}
            size="small"
            color="success"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        );
      case NotificationDeliveryStatus.FAILED:
        return (
          <Chip
            icon={<FailedIcon sx={{ fontSize: '14px !important' }} />}
            label="FAILED"
            size="small"
            color="error"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        );
      case NotificationDeliveryStatus.RETRYING:
        return (
          <Chip
            icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
            label="RETRYING"
            size="small"
            color="warning"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        );
      default:
        return (
          <Chip
            label={status.toUpperCase()}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        );
    }
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    return (
      <Chip
        label={channel.toUpperCase()}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700, fontSize: '0.68rem', borderColor: 'divider' }}
      />
    );
  };

  return (
    <Box sx={{ width: '100%', py: { xs: 2, md: 3 } }}>
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <NotificationIcon sx={{ color: 'primary.main', fontSize: 30 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Notification Management & Delivery Monitor
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Phase 17 Communication System — Monitor transactional email outbox jobs, inspect delivery attempts, manage failures, and review event templates.
          </Typography>
        </Box>
      </Paper>

      {/* Tabs */}
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
          value={currentTab}
          onChange={(_e, val) => setCurrentTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ px: 2 }}
        >
          <Tab value="outbox" label="Delivery Outbox & Activity Log" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab value="templates" label="Registered Templates Catalog" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      </Paper>

      {/* OUTBOX TAB */}
      {currentTab === 'outbox' && (
        <>
          {/* Filters Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: '14px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              placeholder="Search recipient or event..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
              }}
              sx={{ minWidth: 260, flexGrow: { xs: 1, md: 0 } }}
            />

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value={NotificationDeliveryStatus.SENT}>Sent / Delivered</MenuItem>
              <MenuItem value={NotificationDeliveryStatus.PENDING}>Pending</MenuItem>
              <MenuItem value={NotificationDeliveryStatus.RETRYING}>Retrying</MenuItem>
              <MenuItem value={NotificationDeliveryStatus.FAILED}>Failed</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Channel"
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Channels</MenuItem>
              <MenuItem value={NotificationChannel.EMAIL}>Email</MenuItem>
              <MenuItem value={NotificationChannel.SMS}>SMS</MenuItem>
              <MenuItem value={NotificationChannel.PUSH}>Push</MenuItem>
              <MenuItem value={NotificationChannel.IN_APP}>In-App</MenuItem>
            </TextField>

            {(statusFilter !== 'all' || channelFilter !== 'all' || searchQuery) && (
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter('all');
                  setChannelFilter('all');
                  setSearchQuery('');
                  setPage(1);
                }}
                sx={{ textTransform: 'none' }}
              >
                Clear Filters
              </Button>
            )}
          </Paper>

          {/* Outbox Table */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={40} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load admin notifications outbox.
            </Alert>
          ) : !outboxData?.items || outboxData.items.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                py: 8,
                textAlign: 'center',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                No notifications found
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                There are no outbox notification records matching the specified criteria.
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Event & Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Attempts</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outboxData.items.map((row: AdminNotificationOutboxDto) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Type: {row.eventType} &bull; ID: {row.eventId}
                          </Typography>
                        </TableCell>
                        <TableCell>{getChannelBadge(row.channel)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                            {row.recipientEmail || row.recipientPhone || row.recipientId || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(row.status)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.attempts} / {row.maxAttempts}
                          </Typography>
                          {row.errorMessage && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'error.main',
                                display: 'block',
                                maxWidth: 220,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {row.errorMessage}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(row.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {(row.status === NotificationDeliveryStatus.FAILED ||
                            row.status === NotificationDeliveryStatus.RETRYING) && (
                            <Tooltip title="Retry dispatch now">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleRetry(row.id)}
                                disabled={retryMutation.isPending}
                              >
                                <RetryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {outboxData.meta.totalPages > 1 && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={outboxData.meta.totalPages}
                    page={page}
                    onChange={(_e, val) => setPage(val)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </Paper>
          )}
        </>
      )}

      {/* TEMPLATES CATALOG TAB */}
      {currentTab === 'templates' && (
        <>
          {isTemplatesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {templates.map((tpl: NotificationTemplateDto) => (
                <Grid item xs={12} md={6} key={tpl.id}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TemplateIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {tpl.name}
                          </Typography>
                        </Box>
                        <Chip label="ACTIVE" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                      </Box>

                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        {tpl.description}
                      </Typography>

                      <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: '8px', mb: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Subject Template:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {tpl.subjectTemplate}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.8 }}>
                          Supported Variables:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                          {tpl.variables.map((v) => (
                            <Chip
                              key={v}
                              label={`{${v}}`}
                              size="small"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};
