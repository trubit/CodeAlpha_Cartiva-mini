import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  SupportAgent as SupportIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { supportService } from '@/services/support.service';
import { useUiStore } from '@/stores/uiStore';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@shared/enums';
import type { SupportTicketDto } from '@shared/api.types';

export const AccountSupportPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>(SupportTicketCategory.GENERAL);
  const [priority, setPriority] = useState<SupportTicketPriority>(SupportTicketPriority.MEDIUM);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await supportService.getMyTickets();
      setTickets(data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please provide both a subject and a message.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const newTicket = await supportService.createTicket({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      });
      setTickets([newTicket, ...tickets]);
      setModalOpen(false);
      setSubject('');
      setMessage('');
      showToast('Support ticket created successfully! Our team will respond shortly.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create support ticket';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: SupportTicketStatus) => {
    switch (status) {
      case SupportTicketStatus.OPEN:
        return 'primary';
      case SupportTicketStatus.IN_PROGRESS:
        return 'info';
      case SupportTicketStatus.RESOLVED:
        return 'success';
      case SupportTicketStatus.CLOSED:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Customer Support Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Communicate directly with our customer care and fulfilment assistance teams
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px' }}
          >
            Create New Ticket
          </Button>
        </Box>

        {loading ? (
          <Skeleton variant="rounded" height={160} sx={{ borderRadius: '12px' }} />
        ) : tickets.length > 0 ? (
          <Stack spacing={2}>
            {tickets.map((t) => (
              <Box
                key={t.id}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  transition: 'all 200ms ease',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.selected' },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                    <Chip
                      label={t.status.replace('_', ' ')}
                      size="small"
                      color={getStatusColor(t.status)}
                      sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={t.category.replace('_', ' ')}
                      size="small"
                      sx={{ bgcolor: 'action.hover', color: 'primary.main', fontWeight: 600, textTransform: 'capitalize' }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Ticket #{t.ticketNumber || t.id.slice(-6).toUpperCase()}
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {t.subject}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Created on {new Date(t.createdAt).toLocaleDateString()} • {t.messages?.length || 1} messages
                  </Typography>
                </Box>

                <Button
                  component={RouterLink}
                  to={`/account/support/${t.id}`}
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 700 }}
                >
                  View Discussion
                </Button>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'action.hover', borderRadius: '14px' }}>
            <SupportIcon sx={{ fontSize: '3rem', color: 'text.secondary', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              No Open Support Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto', mb: 3 }}>
              Have questions regarding an order, payment, or delivery? Our 24/7 support team is here to assist you.
            </Typography>
            <Button variant="contained" onClick={() => setModalOpen(true)} sx={{ bgcolor: 'primary.main' }}>
              Open a Support Ticket
            </Button>
          </Box>
        )}
      </Paper>

      {/* New Ticket Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>
          Open a Support Ticket
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateTicket}>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Subject / Topic"
                placeholder="e.g. Inquiring about delivery timing for order ORD-1234"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                >
                  <MenuItem value={SupportTicketCategory.ORDER_INQUIRY}>Order Inquiry</MenuItem>
                  <MenuItem value={SupportTicketCategory.PRODUCT_QUESTION}>Product Question</MenuItem>
                  <MenuItem value={SupportTicketCategory.PAYMENT_ISSUE}>Payment Issue</MenuItem>
                  <MenuItem value={SupportTicketCategory.RETURN_REFUND}>Return & Refund</MenuItem>
                  <MenuItem value={SupportTicketCategory.GENERAL}>General Support</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  label="Priority"
                  onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                >
                  <MenuItem value={SupportTicketPriority.LOW}>Low</MenuItem>
                  <MenuItem value={SupportTicketPriority.MEDIUM}>Medium</MenuItem>
                  <MenuItem value={SupportTicketPriority.HIGH}>High</MenuItem>
                  <MenuItem value={SupportTicketPriority.URGENT}>Urgent</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message Details"
                placeholder="Describe your issue or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setModalOpen(false)} sx={{ color: '#64748B' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ bgcolor: '#1557D5', color: '#FFFFFF', fontWeight: 700 }}
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
