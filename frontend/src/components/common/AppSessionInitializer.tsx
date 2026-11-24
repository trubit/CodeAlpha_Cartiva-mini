import React, { useEffect, useRef } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

/**
 * Cartiva Mini — App Session Initializer
 * Performs a fast, non-blocking silent session bootstrap on initial application load.
 * Restores in-memory access token from the secure httpOnly refresh cookie without
 * leaving guests or unauthenticated visitors stuck on an unresolved loading state.
 */
export const AppSessionInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Safety timeout: Never allow network stalls or slow proxies to block UI beyond 800ms
    const timeoutId = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        useAuthStore.getState().setLoading(false);
      }
    }, 800);

    // If already authenticated (e.g. state hydrated), skip
    if (useAuthStore.getState().isAuthenticated) {
      clearTimeout(timeoutId);
      useAuthStore.getState().setLoading(false);
      return;
    }

    // Silent session restoration
    authService
      .refresh()
      .then((response) => {
        if (response?.data?.user && response?.data?.accessToken) {
          useAuthStore.getState().setAuth(response.data.user, response.data.accessToken);
        } else {
          useAuthStore.getState().clearAuth();
        }
      })
      .catch(() => {
        // No active refresh session cookie or expired token: gracefully transition to guest
        useAuthStore.getState().clearAuth();
      })
      .finally(() => {
        clearTimeout(timeoutId);
        // Unconditionally dismiss loading in global store
        useAuthStore.getState().setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      // Guarantee loading is never left trapped in true state upon unmount or remount
      if (useAuthStore.getState().isLoading) {
        useAuthStore.getState().setLoading(false);
      }
    };
  }, []);

  return <>{children}</>;
};

