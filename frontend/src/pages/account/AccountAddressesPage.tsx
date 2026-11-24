import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  LocationOn as AddressPinIcon,
  CheckCircle as DefaultIcon,
} from '@mui/icons-material';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/hooks/useAddresses';
import { useUiStore } from '@/stores/uiStore';
import type { AddressDto } from '@shared/api.types';

export const AccountAddressesPage: React.FC = () => {
  const { showToast } = useUiStore();
  const { data: addresses = [], isLoading } = useAddresses();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);

  // Form fields
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAddress(null);
    setRecipientName('');
    setPhone('');
    setStreetAddress('');
    setCity('');
    setStateName('Lagos');
    setPostalCode('');
    setCountry('Nigeria');
    setIsDefault(addresses.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (addr: AddressDto) => {
    setEditingAddress(addr);
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setStreetAddress(addr.streetAddress);
    setCity(addr.city);
    setStateName(addr.state);
    setPostalCode(addr.postalCode || '');
    setCountry(addr.country || 'Nigeria');
    setIsDefault(Boolean(addr.isDefault));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !streetAddress.trim() || !city.trim() || !stateName.trim() || !phone.trim()) {
      showToast('Please fill in all required address fields.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingAddress) {
        await updateAddressMutation.mutateAsync({
          addressId: editingAddress.id,
          dto: {
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            streetAddress: streetAddress.trim(),
            city: city.trim(),
            state: stateName.trim(),
            postalCode: postalCode.trim() || undefined,
            country: country.trim() || 'Nigeria',
          },
        });
        showToast('Address updated successfully!', 'success');
      } else {
        await createAddressMutation.mutateAsync({
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          state: stateName.trim(),
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || 'Nigeria',
          isDefault,
        });
        showToast('New address saved successfully!', 'success');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save address';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      await deleteAddressMutation.mutateAsync(addressId);
      showToast('Address removed', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete address';
      showToast(msg, 'error');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultMutation.mutateAsync(addressId);
      showToast('Default delivery address updated!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not set default address';
      showToast(msg, 'error');
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Saved Delivery Addresses
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Manage destination shipping addresses for expedited order checkout
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateModal}
            sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px' }}
          >
            Add New Address
          </Button>
        </Box>

        {isLoading ? (
          <Skeleton variant="rounded" height={150} sx={{ borderRadius: '12px' }} />
        ) : addresses.length > 0 ? (
          <Grid container spacing={3}>
            {addresses.map((addr) => (
              <Grid item xs={12} sm={6} key={addr.id}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    border: '1.5px solid',
                    borderColor: addr.isDefault ? 'primary.main' : 'divider',
                    bgcolor: addr.isDefault ? 'action.selected' : 'background.paper',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {addr.recipientName}
                      </Typography>
                      {addr.isDefault && (
                        <Chip
                          icon={<DefaultIcon fontSize="small" />}
                          label="Default"
                          size="small"
                          sx={{ bgcolor: 'action.hover', color: 'primary.main', fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {addr.streetAddress}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {addr.city}, {addr.state} {addr.postalCode ? `(${addr.postalCode})` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Phone: {addr.phone}
                    </Typography>
                  </Box>

                  <Box sx={{ pt: 2, mt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {!addr.isDefault ? (
                      <Button
                        size="small"
                        onClick={() => handleSetDefault(addr.id)}
                        sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.8rem' }}
                      >
                        Set as Default
                      </Button>
                    ) : <Box />}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => openEditModal(addr)} sx={{ color: 'primary.main' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(addr.id)} sx={{ color: '#EF4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'action.hover', borderRadius: '12px' }}>
            <AddressPinIcon sx={{ fontSize: '3rem', color: 'text.secondary', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              No Delivery Addresses Saved
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Add a delivery address to ensure seamless shipping rate calculations and checkout.
            </Typography>
            <Button variant="contained" onClick={openCreateModal} sx={{ bgcolor: 'primary.main' }}>
              Add Address
            </Button>
          </Box>
        )}
      </Paper>

      {/* Address Form Dialog Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>
          {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Recipient Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address / Suite"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City / Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State (e.g. Lagos, Abuja FCT)"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code (Optional)"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={country}
                  disabled
                />
              </Grid>
              {!editingAddress && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Make this my default delivery address"
                  />
                </Grid>
              )}
            </Grid>
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
              {submitting ? 'Saving...' : 'Save Address'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
