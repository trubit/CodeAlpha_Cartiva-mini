import React from 'react';
import { Box, Typography, Button, Chip, Stack, IconButton, Tooltip } from '@mui/material';
import {
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as DefaultIcon,
  LocalShippingOutlined as ShippingIcon,
} from '@mui/icons-material';
import type { AddressDto } from '@shared/api.types.js';

interface AddressCardProps {
  address: AddressDto;
  isSelected?: boolean;
  onSelect?: (address: AddressDto) => void;
  onEdit?: (address: AddressDto) => void;
  onDelete?: (addressId: string) => void;
  onSetDefault?: (addressId: string) => void;
  selectable?: boolean;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = true,
}) => {
  const isDefault = Boolean(address.isDefault);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        bgcolor: isSelected ? 'rgba(14, 165, 233, 0.04)' : 'background.paper',
        boxShadow: isSelected ? '0 4px 12px rgba(14, 165, 233, 0.12)' : 'none',
        transition: 'all 200ms ease-in-out',
        position: 'relative',
        cursor: selectable && onSelect ? 'pointer' : 'default',
        '&:hover': {
          borderColor: isSelected ? 'primary.main' : 'primary.light',
        },
      }}
      onClick={() => {
        if (selectable && onSelect) onSelect(address);
      }}
    >
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {address.recipientName}
          </Typography>
          {isDefault && (
            <Chip
              size="small"
              icon={<DefaultIcon sx={{ fontSize: '14px !important' }} />}
              label="Default"
              color="primary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
            />
          )}
        </Box>

        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <Tooltip title="Edit Address">
              <IconButton size="small" onClick={() => onEdit(address)} aria-label="Edit address">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && !isDefault && (
            <Tooltip title="Delete Address">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(address.id)}
                aria-label="Delete address"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {address.streetAddress}
        {address.apartmentSuite ? `, ${address.apartmentSuite}` : ''}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {address.city}, {address.state}
        {address.postalCode ? ` ${address.postalCode}` : ''}, {address.country}
      </Typography>

      <Typography variant="body2" color="text.primary" fontWeight={500} sx={{ mt: 1 }}>
        Phone: {address.phone}
      </Typography>

      {address.deliveryInstructions && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 1,
            p: 1,
            bgcolor: 'action.hover',
            borderRadius: 1,
            fontStyle: 'italic',
          }}
        >
          Note: {address.deliveryInstructions}
        </Typography>
      )}

      {selectable && onSelect && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            variant={isSelected ? 'contained' : 'outlined'}
            color="primary"
            startIcon={<ShippingIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(address);
            }}
          >
            {isSelected ? 'Delivering Here' : 'Deliver to this Address'}
          </Button>

          {!isDefault && onSetDefault && (
            <Button
              size="small"
              color="inherit"
              sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.8rem' }}
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(address.id);
              }}
            >
              Set as Default
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
