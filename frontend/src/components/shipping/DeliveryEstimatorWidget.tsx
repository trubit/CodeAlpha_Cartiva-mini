import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  MenuItem,
  TextField,
  CircularProgress,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  LocalShippingOutlined as ShippingIcon,
  VerifiedOutlined as VerifiedIcon,
  ScheduleOutlined as TimeIcon,
} from '@mui/icons-material';
import { useShippingAvailability, useShippingMethods } from '../../hooks/useShipping.js';

export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

export const DeliveryEstimatorWidget: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('Lagos');

  const { data: availability, isLoading: isChecking } = useShippingAvailability(
    'Nigeria',
    selectedState
  );

  const { data: methods } = useShippingMethods('Nigeria', selectedState);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'var(--cm-shadow-md)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShippingIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Nationwide Delivery Calculator
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Check authoritative live shipping transit times and rates for your region
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={8}>
          <TextField
            select
            fullWidth
            size="small"
            label="Select Destination State"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {NIGERIAN_STATES.map((st) => (
              <MenuItem key={st} value={st}>
                {st}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              icon={<VerifiedIcon />}
              label="Active Logistics"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600, height: 28 }}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Results View */}
      {isChecking ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Querying active shipping carrier rates...
          </Typography>
        </Box>
      ) : availability && availability.isAvailable ? (
        <Stack spacing={1.5}>
          {methods && methods.length > 0 ? (
            methods.map((method) => (
              <Box
                key={method.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {method.methodName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      Carrier: {method.carrierName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      •
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <TimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {method.estimatedDeliveryText}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                    From ₦{method.baseRate.toLocaleString()}
                  </Typography>
                  {method.freeShippingThreshold && (
                    <Typography
                      variant="caption"
                      color="success.main"
                      fontWeight={600}
                      display="block"
                    >
                      Free over ₦{method.freeShippingThreshold.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Standard delivery available starting from ₦2,500.
            </Typography>
          )}
        </Stack>
      ) : (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Delivery to {selectedState} is currently handled by special regional arrangement. Please
          contact our support concierge for assistance.
        </Alert>
      )}
    </Paper>
  );
};
