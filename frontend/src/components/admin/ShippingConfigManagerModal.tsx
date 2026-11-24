import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  LocalShippingOutlined as ShippingIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useAdminShippingConfigurations,
  useCreateShippingConfig,
  useUpdateShippingConfig,
  useToggleShippingConfigStatus,
  useDeleteShippingConfig,
} from '../../hooks/useShipping.js';
import { ShippingCalculationType } from '@shared/enums.js';
import type { ShippingMethodDto, CreateShippingConfigDto } from '@shared/api.types.js';

interface ShippingConfigManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export const ShippingConfigManagerModal: React.FC<ShippingConfigManagerModalProps> = ({
  open,
  onClose,
}) => {
  const { data: configs, isLoading, error, refetch } = useAdminShippingConfigurations();
  const createMutation = useCreateShippingConfig();
  const updateMutation = useUpdateShippingConfig();
  const toggleMutation = useToggleShippingConfigStatus();
  const deleteMutation = useDeleteShippingConfig();

  // Form State for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateShippingConfigDto>({
    zoneName: '',
    methodName: 'Standard Delivery',
    carrierName: '',
    description: '',
    rateCalculationType: ShippingCalculationType.FLAT,
    baseRate: 2500,
    ratePerAdditionalKg: 0,
    freeShippingThreshold: 50000,
    estimatedDeliveryDaysMin: 1,
    estimatedDeliveryDaysMax: 3,
    countriesCovered: ['Nigeria'],
    statesCovered: ['Lagos'],
    currency: 'NGN',
    isActive: true,
  });

  const [statesInput, setStatesInput] = useState('Lagos');

  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData({
      zoneName: '',
      methodName: 'Standard Delivery',
      carrierName: '',
      description: '',
      rateCalculationType: ShippingCalculationType.FLAT,
      baseRate: 2500,
      ratePerAdditionalKg: 0,
      freeShippingThreshold: 50000,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 3,
      countriesCovered: ['Nigeria'],
      statesCovered: ['Lagos'],
      currency: 'NGN',
      isActive: true,
    });
    setStatesInput('Lagos');
  };

  const handleStartEdit = (config: ShippingMethodDto) => {
    setIsEditing(true);
    setEditingId(config.id);
    setFormData({
      zoneName: config.zoneName,
      methodName: config.methodName,
      carrierName: config.carrierName,
      description: config.description || '',
      rateCalculationType: config.rateCalculationType,
      baseRate: config.baseRate,
      ratePerAdditionalKg: config.ratePerAdditionalKg,
      freeShippingThreshold: config.freeShippingThreshold || undefined,
      estimatedDeliveryDaysMin: config.estimatedDeliveryDaysMin,
      estimatedDeliveryDaysMax: config.estimatedDeliveryDaysMax,
      countriesCovered: config.countriesCovered || ['Nigeria'],
      statesCovered: config.statesCovered,
      currency: config.currency,
      isActive: config.isActive,
    });
    setStatesInput(config.statesCovered.join(', '));
  };

  const handleSave = async () => {
    const parsedStates = statesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload: CreateShippingConfigDto = {
      ...formData,
      statesCovered: parsedStates.length > 0 ? parsedStates : ['*'],
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, dto: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsEditing(false);
    setEditingId(null);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleMutation.mutateAsync({ id, isActive: !currentStatus });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this shipping configuration?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShippingIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Shipping & Delivery Configuration Manager
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          {!isEditing && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleStartCreate}
            >
              Add Shipping Method
            </Button>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load shipping configurations. Please check admin permissions.
          </Alert>
        )}

        {isEditing ? (
          /* Create / Edit Form */
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {editingId ? 'Edit Shipping Configuration' : 'Create New Shipping Configuration'}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Zone Name"
                  fullWidth
                  size="small"
                  required
                  placeholder="e.g. Lagos Metro Zone"
                  value={formData.zoneName}
                  onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Method Name"
                  fullWidth
                  size="small"
                  required
                  placeholder="e.g. Standard Delivery, Express Courier"
                  value={formData.methodName}
                  onChange={(e) => setFormData({ ...formData, methodName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Carrier Name"
                  fullWidth
                  size="small"
                  required
                  placeholder="e.g. GIG Logistics, DHL Express"
                  value={formData.carrierName}
                  onChange={(e) => setFormData({ ...formData, carrierName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Rate Calculation Type"
                  fullWidth
                  size="small"
                  value={formData.rateCalculationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateCalculationType: e.target.value as ShippingCalculationType,
                    })
                  }
                >
                  <MenuItem value={ShippingCalculationType.FLAT}>Flat Rate</MenuItem>
                  <MenuItem value={ShippingCalculationType.WEIGHT_TIERED}>Weight-Tiered</MenuItem>
                  <MenuItem value={ShippingCalculationType.FREE_ABOVE_THRESHOLD}>
                    Free Over Threshold
                  </MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Base Shipping Rate (₦)"
                  type="number"
                  fullWidth
                  size="small"
                  required
                  value={formData.baseRate}
                  onChange={(e) => setFormData({ ...formData, baseRate: Number(e.target.value) })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Rate per Additional Kg (₦)"
                  type="number"
                  fullWidth
                  size="small"
                  disabled={formData.rateCalculationType !== ShippingCalculationType.WEIGHT_TIERED}
                  value={formData.ratePerAdditionalKg}
                  onChange={(e) =>
                    setFormData({ ...formData, ratePerAdditionalKg: Number(e.target.value) })
                  }
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Free Shipping Threshold (₦)"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="e.g. 50000"
                  value={formData.freeShippingThreshold || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      freeShippingThreshold: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Estimated Min Days"
                  type="number"
                  fullWidth
                  size="small"
                  required
                  value={formData.estimatedDeliveryDaysMin}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedDeliveryDaysMin: Number(e.target.value) })
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Estimated Max Days"
                  type="number"
                  fullWidth
                  size="small"
                  required
                  value={formData.estimatedDeliveryDaysMax}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedDeliveryDaysMax: Number(e.target.value) })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Covered States / Territories (Comma separated, or * for all)"
                  fullWidth
                  size="small"
                  required
                  helperText="Enter comma-separated states (e.g. Lagos, Ogun, Oyo) or * for nationwide/all states"
                  value={statesInput}
                  onChange={(e) => setStatesInput(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description / Transit Notes"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Direct dispatch with tracking notification upon handover."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button onClick={() => setIsEditing(false)} color="inherit">
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Update Configuration'
                    : 'Create Method'}
              </Button>
            </Box>
          </Paper>
        ) : (
          /* Table of Existing Configurations */
          <Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={36} />
              </Box>
            ) : !configs || configs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'action.hover', borderRadius: 2 }}>
                <ShippingIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  No Shipping Configurations Configured
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first shipping method and service zone to enable live delivery quotes.
                </Typography>
                <Button variant="contained" color="primary" onClick={handleStartCreate}>
                  Create First Method
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Method & Zone</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Carrier</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Base Rate</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Free Over</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Transit Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {config.methodName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {config.zoneName} ({config.statesCovered.length} states)
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{config.carrierName}</Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={config.rateCalculationType}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            ₦{config.baseRate.toLocaleString()}
                          </Typography>
                          {config.ratePerAdditionalKg > 0 && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              +₦{config.ratePerAdditionalKg}/kg
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          {config.freeShippingThreshold ? (
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              ₦{config.freeShippingThreshold.toLocaleString()}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              None
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{config.estimatedDeliveryText}</Typography>
                        </TableCell>

                        <TableCell>
                          <Switch
                            size="small"
                            checked={config.isActive}
                            onChange={() => handleToggle(config.id, config.isActive)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit Configuration">
                              <IconButton size="small" onClick={() => handleStartEdit(config)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Configuration">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(config.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
