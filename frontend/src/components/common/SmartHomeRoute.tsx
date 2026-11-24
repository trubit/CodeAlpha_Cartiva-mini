import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { HomePage } from '@/pages/HomePage';

/**
 * Cartiva Mini — Smart Home Route Guard
 * Displays the public storefront homepage immediately without blocking on authentication loading states.
 * Intelligently redirects active authenticated sessions directly to their role-specific dashboard.
 */
export const SmartHomeRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  // Redirect authenticated sessions directly to their role-specific dashboard
  if (isAuthenticated && user) {
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'staff') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Public visitors see the full storefront landing page immediately
  return <HomePage />;
};
