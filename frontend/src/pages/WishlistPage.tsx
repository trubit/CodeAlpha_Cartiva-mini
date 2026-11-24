import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  IconButton,
  Chip,
  CardMedia,
  Stack,
} from '@mui/material';
import {
  DeleteOutline as DeleteIcon,
  AddShoppingCart as AddCartIcon,
  FavoriteBorder as EmptyWishlistIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { wishlistService } from '@/services/wishlist.service';
import type { WishlistItemDto } from '@shared/api.types';
import { useQueryClient } from '@tanstack/react-query';

export const WishlistPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { setCartDrawerOpen, showToast } = useUiStore();
  const { data: wishlistData } = useWishlist({ enabled: isAuthenticated });
  const removeFromWishlistMutation = useRemoveFromWishlist();

  const items: WishlistItemDto[] = wishlistData?.data?.items || [];

  const handleRemove = async (itemId: string, title?: string) => {
    try {
      await removeFromWishlistMutation.mutateAsync(itemId);
      showToast(`Removed "${title || 'Item'}" from wishlist`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item';
      showToast(msg, 'error');
    }
  };

  const handleMoveToCart = async (item: WishlistItemDto) => {
    try {
      await wishlistService.moveToCart(item.id, { quantity: 1 });
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast(`Moved "${item.title || 'Item'}" to your cart!`, 'success');
      setCartDrawerOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to move to cart';
      showToast(msg, 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <EmptyWishlistIcon sx={{ fontSize: '2.5rem' }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Your Wishlist
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 440, mx: 'auto', mb: 4 }}>
          Please sign in to save your favourite products, track price drops, and move items into your shopping cart.
        </Typography>
        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, px: 4, py: 1.2 }}
        >
          Sign In
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Home / Account / Wishlist
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', mt: 0.5 }}>
            Saved Wishlist
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} saved for later
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: '18px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <EmptyWishlistIcon sx={{ fontSize: '2.4rem' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              Your Wishlist is Empty
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto', mb: 3 }}>
              You haven&apos;t added any items to your wishlist yet. Explore our catalog and tap the heart icon to save products!
            </Typography>
            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700, px: 3.5, py: 1.2 }}
            >
              Start Shopping
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {items.map((item) => {
              const title = item.title || 'Saved Product';
              const price = item.currentPrice || item.salePrice || item.regularPrice || 0;
              const inStock = item.isAvailable;
              const imgUrl =
                item.thumbnailUrl ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      },
                    }}
                  >
                    <Box>
                      {/* Image Preview */}
                      <Box
                        component={RouterLink}
                        to={item.slug ? `/products/${item.slug}` : '/shop'}
                        sx={{
                          display: 'block',
                          height: 180,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          p: 1.5,
                          mb: 2,
                          textAlign: 'center',
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={imgUrl}
                          alt={title}
                          sx={{ height: '100%', objectFit: 'contain' }}
                        />
                      </Box>

                      {/* Stock Badge */}
                      <Box sx={{ mb: 1 }}>
                        {inStock ? (
                          <Chip label="In Stock" size="small" color="success" sx={{ fontWeight: 700, height: 20, fontSize: '0.68rem' }} />
                        ) : (
                          <Chip label="Out of Stock" size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.68rem', bgcolor: 'text.secondary', color: '#FFFFFF' }} />
                        )}
                      </Box>

                      {/* Title */}
                      <Typography
                        component={RouterLink}
                        to={item.slug ? `/products/${item.slug}` : '/shop'}
                        variant="subtitle2"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          textDecoration: 'none',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.35,
                          mb: 1,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {title}
                      </Typography>

                      {/* Price */}
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', mb: 2 }}>
                        ₦{price.toLocaleString()}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          disabled={!inStock}
                          onClick={() => handleMoveToCart(item)}
                          startIcon={<AddCartIcon sx={{ fontSize: '1rem' }} />}
                          sx={{
                            bgcolor: 'primary.main',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            borderRadius: '8px',
                          }}
                        >
                          Move to Cart
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleRemove(item.id, title)}
                          sx={{ color: '#EF4444', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                          aria-label="Remove item from wishlist"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
};
