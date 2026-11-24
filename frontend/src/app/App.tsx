import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getMuiTheme } from '@/styles/theme';
import { useUiStore } from '@/stores/uiStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppSessionInitializer } from '@/components/common/AppSessionInitializer';
import { AppRoutes } from '@/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Bounded retries: immediately fail permanent 401, 403, 404 client errors
        const axiosErr = error as { response?: { status?: number } };
        const status = axiosErr?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  const themeMode = useUiStore((state) => state.themeMode);
  const theme = useMemo(() => getMuiTheme(themeMode), [themeMode]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppSessionInitializer>
            <AppRoutes />
          </AppSessionInitializer>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
