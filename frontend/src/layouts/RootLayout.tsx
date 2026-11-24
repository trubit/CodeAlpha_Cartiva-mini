import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { GlobalToast } from '@/components/common/GlobalToast';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const isShop = location.pathname === '/shop' || location.pathname.startsWith('/shop');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      {!isShop && <Footer />}
      <CartDrawer />
      <GlobalToast />
    </Box>
  );
};
