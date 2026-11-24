import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, LocationOnOutlined as LocationIcon } from '@mui/icons-material';
import { AddressCard } from './AddressCard.js';
import { AddressFormModal } from './AddressFormModal.js';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '../../hooks/useAddresses.js';
import type { AddressDto, CreateAddressDto } from '@shared/api.types.js';

interface AddressSelectorModalProps {
  open: boolean;
  onClose: () => void;
  selectedAddressId?: string;
  onSelectAddress: (address: AddressDto) => void;
}

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  open,
  onClose,
  selectedAddressId,
  onSelectAddress,
}) => {
  const { data: addresses, isLoading, error } = useAddresses();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (address: AddressDto) => {
    setEditingAddress(address);
    setFormModalOpen(true);
  };

  const handleDelete = async (addressId: string) => {
    if (window.confirm('Are you sure you want to delete this delivery address?')) {
      await deleteAddressMutation.mutateAsync(addressId);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    await setDefaultMutation.mutateAsync(addressId);
  };

  const handleSaveForm = async (dto: CreateAddressDto) => {
    if (editingAddress) {
      await updateAddressMutation.mutateAsync({
        addressId: editingAddress.id,
        dto,
      });
    } else {
      const created = await createAddressMutation.mutateAsync(dto);
      onSelectAddress(created);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Select Delivery Address
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            Add New Address
          </Button>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 3 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load saved addresses. Please try again.
            </Alert>
          )}

          {!isLoading && (!addresses || addresses.length === 0) && (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                px: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                No Saved Delivery Addresses
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}
              >
                You have not added any delivery addresses yet. Add your preferred destination to
                view instant shipping fees and delivery estimates.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
              >
                Add Your First Address
              </Button>
            </Box>
          )}

          {!isLoading && addresses && addresses.length > 0 && (
            <Stack spacing={2}>
              {addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  isSelected={addr.id === selectedAddressId}
                  onSelect={(selected) => {
                    onSelectAddress(selected);
                    onClose();
                  }}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Form Modal */}
      <AddressFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSaveForm}
        initialData={editingAddress}
        isLoading={createAddressMutation.isPending || updateAddressMutation.isPending}
      />
    </>
  );
};
