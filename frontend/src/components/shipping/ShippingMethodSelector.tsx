import React from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  BoltOutlined as FastShippingIcon,
  CheckCircle as FreeDeliveryIcon,
  ScheduleOutlined as TimeIcon,
} from '@mui/icons-material';
import type { ShippingQuoteItemDto } from '@shared/api.types.js';

interface ShippingMethodSelectorProps {
  quotes: ShippingQuoteItemDto[];
  selectedMethodId?: string;
  onSelectMethod: (method: ShippingQuoteItemDto) => void;
  isLoading?: boolean;
  isDeliverable?: boolean;
  message?: string;
}

export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  quotes,
  selectedMethodId,
  onSelectMethod,
  isLoading = false,
  isDeliverable = true,
  message,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4, justifyContent: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Calculating authoritative shipping options...
        </Typography>
      </Box>
    );
  }

  if (!isDeliverable || quotes.length === 0) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Delivery Unavailable
        </Typography>
        <Typography variant="body2">
          {message ||
            'We currently do not offer delivery to this destination. Please update your delivery location or contact concierge support.'}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography
        variant="subtitle2"
        fontWeight={700}
        gutterBottom
        textTransform="uppercase"
        letterSpacing="0.5px"
      >
        Available Shipping Methods
      </Typography>

      <RadioGroup
        value={selectedMethodId || (quotes[0] ? quotes[0].methodId : '')}
        onChange={(_e, value) => {
          const chosen = quotes.find((q) => q.methodId === value);
          if (chosen) onSelectMethod(chosen);
        }}
      >
        <Stack spacing={1.5}>
          {quotes.map((quote) => {
            const isSelected = selectedMethodId === quote.methodId;

            return (
              <Paper
                key={quote.methodId}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'rgba(14, 165, 233, 0.04)' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 150ms ease-in-out',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.main' : 'primary.light',
                  },
                }}
                onClick={() => onSelectMethod(quote)}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <FormControlLabel
                      value={quote.methodId}
                      control={<Radio size="small" />}
                      label=""
                      sx={{ m: 0, mt: -0.5 }}
                    />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {quote.methodName}
                        </Typography>
                        {quote.isFreeShipping && (
                          <Chip
                            size="small"
                            icon={<FreeDeliveryIcon sx={{ fontSize: '13px !important' }} />}
                            label="FREE SHIPPING"
                            color="success"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        )}
                        {quote.estimatedDaysMax <= 1 && (
                          <Chip
                            size="small"
                            icon={<FastShippingIcon sx={{ fontSize: '13px !important' }} />}
                            label="EXPRESS"
                            color="secondary"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="block">
                        Carrier: {quote.carrierName}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Est. Transit: {quote.estimatedDeliveryText}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    {quote.isFreeShipping ? (
                      <Typography variant="subtitle1" fontWeight={800} color="success.main">
                        FREE
                      </Typography>
                    ) : (
                      <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                        ₦{quote.fee.toLocaleString()}
                      </Typography>
                    )}

                    {quote.amountNeededForFreeShipping !== undefined &&
                      quote.amountNeededForFreeShipping > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Add ₦{quote.amountNeededForFreeShipping.toLocaleString()} for Free
                          Delivery
                        </Typography>
                      )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </RadioGroup>
    </Box>
  );
};
