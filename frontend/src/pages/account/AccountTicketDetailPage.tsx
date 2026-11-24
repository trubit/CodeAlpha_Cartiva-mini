import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  TextField,
  Stack,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { supportService } from '@/services/support.service';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import type { SupportTicketDto } from '@shared/api.types';

export const AccountTicketDetailPage: React.FC = () => {
  const { ticketId = '' } = useParams<{ ticketId: string }>();
  const { user } = useAuthStore();
  const { showToast } = useUiStore();

  const [ticket, setTicket] = useState<SupportTicketDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return;
      try {
        setLoading(true);
        const data = await supportService.getTicketDetail(ticketId);
        setTicket(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load ticket';
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, showToast]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !ticketId) return;

    try {
      setSubmittingReply(true);
      const updated = await supportService.addMessage(ticketId, {
        content: replyMessage.trim(),
      });
      setTicket(updated);
      setReplyMessage('');
      showToast('Reply dispatched successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reply';
      showToast(msg, 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '12px', my: 2 }} />
      </Paper>
    );
  }

  if (!ticket) {
    return (
      <Paper elevation={0} sx={{ p: 6, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Ticket Not Found
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          This support ticket does not exist or you do not have permission to access it.
        </Typography>
        <Button component={RouterLink} to="/account/support" variant="contained" sx={{ bgcolor: 'primary.main', color: '#FFFFFF' }}>
          Back to Support Tickets
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to="/account/support"
          startIcon={<BackIcon />}
          sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, '&:hover': { color: 'primary.main' } }}
        >
          Back to Tickets
        </Button>
      </Box>

      {/* Ticket Details Paper */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {ticket.subject}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={ticket.status.replace('_', ' ')} color="primary" size="small" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
            <Chip label={ticket.category.replace('_', ' ')} size="small" sx={{ bgcolor: 'action.hover', color: 'primary.main', fontWeight: 700, textTransform: 'capitalize' }} />
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Ticket Reference: #{ticket.ticketNumber || ticket.id.slice(-6).toUpperCase()} • Created on {new Date(ticket.createdAt).toLocaleString()}
        </Typography>
      </Paper>

      {/* Conversation Thread */}
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 3 }}>
          Conversation History
        </Typography>

        <Stack spacing={2.5}>
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg, idx) => {
              const isStaff = msg.senderRole === 'admin' || msg.senderRole === 'staff';
              return (
                <Box
                  key={idx}
                  sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    bgcolor: isStaff ? 'action.selected' : 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxWidth: { xs: '100%', sm: '85%' },
                    alignSelf: isStaff ? 'flex-start' : 'flex-end',
                    ml: isStaff ? 0 : 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isStaff ? 'primary.main' : 'text.primary' }}>
                      {isStaff ? 'Cartiva Support Specialist' : `${user?.firstName || 'You'} (Customer)`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {msg.content}
                  </Typography>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No messages logged yet.
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 4 }} />

        {/* Reply Box */}
        <Box component="form" onSubmit={handleSendReply}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5 }}>
            Post a Reply
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Type your response or additional information..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={submittingReply}
            startIcon={<SendIcon />}
            sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, px: 3, py: 1 }}
          >
            {submittingReply ? 'Sending...' : 'Send Reply'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
