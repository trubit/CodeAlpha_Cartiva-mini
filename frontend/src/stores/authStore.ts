import { create } from 'zustand';
import type { SafeUser } from '@shared/api.types.js';

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: SafeUser, token: string) => void;
  setUser: (user: SafeUser) => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Cartiva Mini — In-Memory Authentication Store (Zustand)
 * Strictly keeps access token in memory (never in non-volatile storage) to mitigate XSS exfiltration.
 * Refresh tokens are managed exclusively through secure, httpOnly cookies by the browser.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // Initially true while session restoration check runs

  setAuth: (user, token) => {
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  setAccessToken: (token) => {
    set({
      accessToken: token,
      isAuthenticated: Boolean(token),
    });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
