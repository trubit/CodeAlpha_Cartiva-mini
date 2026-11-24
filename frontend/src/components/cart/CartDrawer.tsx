/**
 * Cartiva Mini — Slide-out Shopping Cart Drawer
 * Customer reviews selected products, updates quantities (- 1 +), removes items,
 * and proceeds directly to checkout.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingBagOutlined as ShoppingBagIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useCart, useUpdateCartQuantity, useRemoveCartItem, useClearCart } from '@/hooks/useCart';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cartDrawerOpen, setCartDrawerOpen } = useUiStore();
  const { data: cartData, isLoading } = useCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const removeItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();

  const cart = cartData?.data;
  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;
  const currency = cart?.currency || 'NGN';

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleUpdateQuantity = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItemMutation.mutate(itemId);
    } else {
      updateQuantityMutation.mutate({ itemId, data: { quantity: newQty } });
    }
  };

  const handleClose = () => {
    setCartDrawerOpen(false);
  };

  const handleProceedToCheckout = () => {
    setCartDrawerOpen(false);
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={cartDrawerOpen}
      onClose={handleClose}
      role="dialog"
      aria-label="Shopping Cart Drawer"
      ModalProps={{
        keepMounted: false,
        disableRestoreFocus: false,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 440 },
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShoppingBagIcon color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'var(--font-heading)' }}>
            Shopping Cart
          </Typography>
          <Badge
            badgeContent={itemCount}
            color="primary"
            sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
          />
        </Box>
        <IconButton
          onClick={() => setCartDrawerOpen(false)}
          size="small"
          aria-label="Close cart drawer"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Cart Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2.5 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              py: 6,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
              }}
            >
              <ShoppingBagIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Your cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mb: 3 }}>
              Explore our curated catalogue and add handcrafted essentials to your cart.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setCartDrawerOpen(false);
                navigate('/');
              }}
              sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: 'none' }}
            >
              Discover Products
            </Button>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                {/* Product Thumbnail */}
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.disabled',
                      }}
                    >
                      <ShoppingBagIcon fontSize="small" />
                    </Box>
                  )}
                </Box>

                {/* Details & Quantity Controls */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    noWrap
                    title={item.title}
                    sx={{ color: 'text.primary' }}
                  >
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    SKU: {item.sku}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mt: 1,
                    }}
                  >
                    {/* Quantity Selector: - 1 + */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                        disabled={updateQuantityMutation.isPending}
                        sx={{ p: 0.5 }}
                        aria-label="Decrease quantity"
                      >
                        <RemoveIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ minWidth: 28, textAlign: 'center' }}
                      >
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                        disabled={updateQuantityMutation.isPending}
                        sx={{ p: 0.5 }}
                        aria-label="Increase quantity"
                      >
                        <AddIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>

                    {/* Price */}
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      {formatPrice(item.lineTotal)}
                    </Typography>

                    {/* Remove button */}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      disabled={removeItemMutation.isPending}
                      aria-label="Remove item"
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}

            {/* Clear Cart Action */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                size="small"
                color="inherit"
                onClick={() => clearCartMutation.mutate()}
                disabled={clearCartMutation.isPending}
                sx={{ textTransform: 'none', fontSize: '0.8125rem', color: 'text.secondary' }}
              >
                Clear Cart
              </Button>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Sticky Bottom Actions */}
      {items.length > 0 && (
        <Box
          sx={{
            p: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Subtotal ({itemCount} item{itemCount > 1 ? 's' : ''})
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {formatPrice(subtotal)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Shipping and delivery fees calculated authoritatively at checkout.
          </Typography>

          <Button
            variant="contained"
            fullWidth
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={handleProceedToCheckout}
            sx={{
              py: 1.5,
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          >
            Proceed to Checkout
          </Button>

          <Button
            variant="text"
            fullWidth
            size="small"
            onClick={() => {
              handleClose();
              navigate('/cart');
            }}
            sx={{ mt: 1, textTransform: 'none', fontWeight: 600, color: 'primary.main' }}
          >
            View Full Cart Page
          </Button>

          <Button
            variant="text"
            fullWidth
            size="small"
            onClick={handleClose}
            sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary' }}
          >
            Continue Shopping
          </Button>
        </Box>
      )}
    </Drawer>
  );
};
