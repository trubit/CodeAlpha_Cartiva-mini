import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';
export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
}

interface UiState {
  themeMode: ThemeMode;
  cartDrawerOpen: boolean;
  mobileMenuOpen: boolean;
  toast: ToastState;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setCartDrawerOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  showToast: (message: string, severity?: ToastSeverity) => void;
  closeToast: () => void;
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem('cartiva_theme_mode');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const useUiStore = create<UiState>((set) => ({
  themeMode: getInitialTheme(),
  cartDrawerOpen: false,
  mobileMenuOpen: false,
  toast: {
    open: false,
    message: '',
    severity: 'info',
  },

  toggleTheme: () =>
    set((state) => {
      const nextMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('cartiva_theme_mode', nextMode);
      document.documentElement.setAttribute('data-theme', nextMode);
      return { themeMode: nextMode };
    }),

  setTheme: (mode) => {
    localStorage.setItem('cartiva_theme_mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
    set({ themeMode: mode });
  },

  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  showToast: (message, severity = 'info') =>
    set({
      toast: {
        open: true,
        message,
        severity,
      },
    }),

  closeToast: () =>
    set((state) => ({
      toast: {
        ...state.toast,
        open: false,
      },
    })),
}));
