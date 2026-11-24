import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import {
  LocationOnOutlined as AddressIcon,
  EmailOutlined as EmailIcon,
  PhoneOutlined as PhoneIcon,
  AccessTimeOutlined as ClockIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useUiStore } from '@/stores/uiStore';

export const ContactPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Please fill in your name, email, and message.', 'warning');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      showToast('Thank you! Your message has been received. Our team will contact you shortly.', 'success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 5, md: 8 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, fontSize: { xs: '2rem', md: '2.6rem' } }}>
            Contact Cartiva Mini
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Have a question, feedback, or business inquiry? We would love to hear from you.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Contact Details Card */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3.5, md: 5 },
                borderRadius: '18px',
                bgcolor: '#101D3B',
                color: '#FFFFFF',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#FFFFFF' }}>
                  Contact Information
                </Typography>
                <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 4 }}>
                  Reach our customer operations and fulfillment desk during business hours.
                </Typography>

                <Stack spacing={3}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <AddressIcon sx={{ color: '#FFB900', mt: 0.3 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                        Fulfillment Warehouse & Hub
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                        55 Isaac John Street, Ikeja GRA, Lagos, Nigeria
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <EmailIcon sx={{ color: '#FFB900', mt: 0.3 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                        Customer Support Email
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                        support@cartivamini.ng
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <PhoneIcon sx={{ color: '#FFB900', mt: 0.3 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                        Helpline Phone
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                        +234 (0) 800-CARTIVA
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <ClockIcon sx={{ color: '#FFB900', mt: 0.3 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                        Operating Hours
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                        Monday – Saturday: 8:00 AM – 8:00 PM WAT
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ pt: 4, mt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                  24/7 ticket submissions are automatically prioritized by order urgency.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Contact Form Card */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3.5, md: 5 },
                borderRadius: '18px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                Send Us a Message
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                Fill out the form below and an agent will respond within 24 hours.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                      label="Subject"
                      placeholder="e.g. Order Delivery Inquiry or Partnership"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      label="Your Message"
                      placeholder="How can we assist you today?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={submitting}
                      startIcon={<SendIcon />}
                      sx={{
                        bgcolor: '#1557D5',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        px: 4,
                        py: 1.4,
                        borderRadius: '10px',
                        '&:hover': { bgcolor: '#0E42A8' },
                      }}
                    >
                      {submitting ? 'Sending Message...' : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
