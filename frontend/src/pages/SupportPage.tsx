import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  SupportAgent as SupportAgentIcon,
  LocalShippingOutlined as ShippingIcon,
  AutorenewOutlined as ReturnsIcon,
  HelpOutline as HelpIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export const SupportPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>('faq-1');

  const handleAccordionChange =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const faqs = [
    {
      id: 'faq-1',
      question: 'How fast is delivery across Nigeria?',
      answer:
        'Deliveries within Lagos take between 24 to 48 hours. Regional deliveries to Abuja, Port Harcourt, Ibadan, and other nationwide destinations typically arrive within 3 to 5 business days via verified express couriers.',
    },
    {
      id: 'faq-2',
      question: 'What payment methods does Cartiva Mini support?',
      answer:
        'We process payments through Paystack, a PCI-DSS Level 1 certified gateway. You can securely pay using debit cards (Mastercard, Visa, Verve), direct bank transfers, or bank USSD.',
    },
    {
      id: 'faq-3',
      question: 'What is your return and refund policy?',
      answer:
        'We offer a 7-day return policy for unopened, defective, or incorrect items. Once an item is inspected at our fulfillment facility, refunds are promptly processed back to your original payment method.',
    },
    {
      id: 'faq-4',
      question: 'How do I track my shipment?',
      answer:
        'You can visit our Track Order page or navigate to "My Orders" in your customer account. Every shipment provides stage-by-stage status updates from packing to dispatch and doorstep delivery.',
    },
    {
      id: 'faq-5',
      question: 'Are products sold on Cartiva Mini authentic?',
      answer:
        'Yes. All products in our catalog are sourced directly from verified manufacturers and authorized regional distributors to guarantee 100% authenticity.',
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 5, md: 8 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Support Header */}
        <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 6 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              bgcolor: 'primary.main',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 20px rgba(21, 87, 213, 0.3)',
            }}
          >
            <SupportAgentIcon sx={{ fontSize: '2rem' }} />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, fontSize: { xs: '2rem', md: '2.6rem' } }}>
            How Can We Assist You?
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Browse common questions or reach out to our customer care specialists for prompt help with your orders.
          </Typography>
        </Box>

        {/* Quick Help Pillars */}
        <Grid container spacing={3} sx={{ mb: 7 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ color: 'primary.main', mb: 1.5 }}>
                  <ShippingIcon sx={{ fontSize: '2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Shipping & Tracking
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Check the live delivery status of an order or calculate estimated doorstep shipping fees.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/orders"
                endIcon={<ArrowForwardIcon />}
                sx={{ color: 'primary.main', fontWeight: 700, alignSelf: 'flex-start' }}
              >
                Track My Order
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ color: 'primary.main', mb: 1.5 }}>
                  <HelpIcon sx={{ fontSize: '2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Support Tickets
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Open an inquiry with our support desk or track responses to existing issues.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/account/support"
                endIcon={<ArrowForwardIcon />}
                sx={{ color: 'primary.main', fontWeight: 700, alignSelf: 'flex-start' }}
              >
                Go to Tickets
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ color: 'primary.main', mb: 1.5 }}>
                  <ReturnsIcon sx={{ fontSize: '2rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  Returns & Refunds
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Learn about our straightforward return timelines, condition requirements, and payment refunds.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/contact"
                endIcon={<ArrowForwardIcon />}
                sx={{ color: 'primary.main', fontWeight: 700, alignSelf: 'flex-start' }}
              >
                Contact Helpdesk
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* FAQs Section */}
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: '18px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Answers to common customer inquiries regarding purchases, delivery, and payments
          </Typography>

          <Box>
            {faqs.map((faq) => (
              <Accordion
                key={faq.id}
                expanded={expanded === faq.id}
                onChange={handleAccordionChange(faq.id)}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  borderRadius: '12px !important',
                  mb: 1.5,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 2.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
