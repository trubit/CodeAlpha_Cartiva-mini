import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useUiStore } from '@/stores/uiStore';

export const GlobalToast: React.FC = () => {
  const { toast, closeToast } = useUiStore();

  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={4500}
      onClose={closeToast}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={closeToast}
        severity={toast.severity}
        variant="filled"
        sx={{
          width: '100%',
          boxShadow: '0 8px 24px rgba(16, 29, 59, 0.18)',
          fontWeight: 600,
          borderRadius: 2,
        }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
};
