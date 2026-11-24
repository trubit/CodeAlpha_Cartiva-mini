import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AddressDto, CreateAddressDto } from '@shared/api.types.js';

const addressFormSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, 'Recipient name must be at least 2 characters.')
    .max(100, 'Recipient name cannot exceed 100 characters.'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g. +2348012345678).'),
  streetAddress: z
    .string()
    .trim()
    .min(3, 'Street address must be at least 3 characters.')
    .max(200, 'Street address cannot exceed 200 characters.'),
  apartmentSuite: z.string().trim().max(50).optional(),
  city: z.string().trim().min(2, 'City is required.').max(100),
  state: z.string().trim().min(2, 'State or region is required.').max(100),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2, 'Country is required.').max(100).default('Nigeria'),
  deliveryInstructions: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAddressDto) => Promise<void>;
  initialData?: AddressDto | null;
  isLoading?: boolean;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      recipientName: '',
      phone: '',
      streetAddress: '',
      apartmentSuite: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Nigeria',
      deliveryInstructions: '',
      isDefault: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        recipientName: initialData.recipientName,
        phone: initialData.phone,
        streetAddress: initialData.streetAddress,
        apartmentSuite: initialData.apartmentSuite || '',
        city: initialData.city,
        state: initialData.state,
        postalCode: initialData.postalCode || '',
        country: initialData.country || 'Nigeria',
        deliveryInstructions: initialData.deliveryInstructions || '',
        isDefault: Boolean(initialData.isDefault),
      });
    } else {
      reset({
        recipientName: '',
        phone: '',
        streetAddress: '',
        apartmentSuite: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Nigeria',
        deliveryInstructions: '',
        isDefault: false,
      });
    }
  }, [initialData, reset, open]);

  const handleFormSubmit = async (data: AddressFormData) => {
    await onSubmit({
      ...data,
      country: data.country || 'Nigeria',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
        {isEditing ? 'Edit Delivery Address' : 'Add New Delivery Address'}
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            {/* Recipient Name */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="recipientName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Recipient Full Name"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.recipientName)}
                    helperText={errors.recipientName?.message}
                  />
                )}
              />
            </Grid>

            {/* Phone Number */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    placeholder="+2348012345678"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.phone)}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Grid>

            {/* Street Address */}
            <Grid item xs={12}>
              <Controller
                name="streetAddress"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Street Address"
                    placeholder="12 Admiralty Way"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.streetAddress)}
                    helperText={errors.streetAddress?.message}
                  />
                )}
              />
            </Grid>

            {/* Apartment, Suite, Unit */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="apartmentSuite"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Apartment, Suite, Unit (Optional)"
                    placeholder="Apt 4B"
                    fullWidth
                    size="small"
                    error={Boolean(errors.apartmentSuite)}
                    helperText={errors.apartmentSuite?.message}
                  />
                )}
              />
            </Grid>

            {/* City */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="City / Locality"
                    placeholder="Lekki"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.city)}
                    helperText={errors.city?.message}
                  />
                )}
              />
            </Grid>

            {/* State / Region */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="State / Province / Region"
                    placeholder="Lagos"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.state)}
                    helperText={errors.state?.message}
                  />
                )}
              />
            </Grid>

            {/* Postal Code */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="postalCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Postal Code (Optional)"
                    placeholder="100001"
                    fullWidth
                    size="small"
                    error={Boolean(errors.postalCode)}
                    helperText={errors.postalCode?.message}
                  />
                )}
              />
            </Grid>

            {/* Country */}
            <Grid item xs={12}>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Country"
                    fullWidth
                    required
                    size="small"
                    error={Boolean(errors.country)}
                    helperText={errors.country?.message}
                  />
                )}
              />
            </Grid>

            {/* Delivery Instructions */}
            <Grid item xs={12}>
              <Controller
                name="deliveryInstructions"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Delivery Instructions / Gate Code (Optional)"
                    placeholder="Ring bell or leave at front desk."
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    error={Boolean(errors.deliveryInstructions)}
                    helperText={errors.deliveryInstructions?.message}
                  />
                )}
              />
            </Grid>

            {/* Set as Default Address */}
            <Grid item xs={12}>
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} checked={field.value} color="primary" />}
                    label={
                      <Typography variant="body2" fontWeight={500}>
                        Set as default shipping address
                      </Typography>
                    }
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
