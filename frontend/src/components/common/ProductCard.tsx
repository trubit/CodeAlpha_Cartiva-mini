import React, { useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Rating,
  Tooltip,
} from '@mui/material';
import {
  Favorite as FavoriteFilledIcon,
  FavoriteBorder as FavoriteBorderIcon,
  AddShoppingCart as AddCartIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useAddToCart } from '@/hooks/useCart';
import { useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist';
import type { ProductListItemDto } from '@shared/api.types';
import { ProductStatus } from '@shared/enums';
import { getMediaUrl, handleImageError } from '@/utils/media.util';

interface ProductCardProps {
  product: ProductListItemDto;
  isWishlisted?: boolean;
  wishlistItemId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted = false,
  wishlistItemId,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setCartDrawerOpen, showToast } = useUiStore();
  const addToCartMutation = useAddToCart();
  const addToWishlistMutation = useAddToWishlist();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const [isAdding, setIsAdding] = useState(false);

  const regularPrice = product.regularPrice || 0;
  const salePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : null;
  const effectivePrice = salePrice || regularPrice;
  const discountPercent =
    salePrice && regularPrice > salePrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null;

  const isOutOfStock =
    product.stockQuantity <= 0 || product.status === ProductStatus.UNPUBLISHED;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    try {
      setIsAdding(true);
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity: 1,
      });
      showToast(`Added "${product.title}" to cart!`, 'success');
      setCartDrawerOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item to cart';
      showToast(msg, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist.', 'info');
      navigate('/login');
      return;
    }

    try {
      if (isWishlisted && wishlistItemId) {
        await removeFromWishlistMutation.mutateAsync(wishlistItemId);
        showToast(`Removed "${product.title}" from wishlist`, 'info');
      } else {
        await addToWishlistMutation.mutateAsync({ productId: product.id });
        showToast(`Added "${product.title}" to wishlist`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update wishlist';
      showToast(msg, 'error');
    }
  };

  const primaryImage = getMediaUrl(
    product.thumbnailUrl ||
    product.images?.find((img) => img.isThumbnail)?.url ||
    (product.images && product.images.length > 0
      ? product.images[product.images.length - 1]?.url
      : undefined) ||
    product.images?.[0]?.url
  );

  return (
    <Card
      component={RouterLink}
      to={`/products/${product.slug}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        position: 'relative',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 28px -4px rgba(16, 29, 59, 0.12)',
          borderColor: 'rgba(21, 87, 213, 0.3)',
          '& .product-card-img': {
            transform: 'scale(1.04)',
          },
        },
      }}
    >
      {/* Top Floating Badges */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {discountPercent ? (
          <Chip
            label={`-${discountPercent}%`}
            size="small"
            sx={{
              bgcolor: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.72rem',
              height: 22,
            }}
          />
        ) : null}
        {product.featured && (
          <Chip
            label="Featured"
            size="small"
            sx={{
              bgcolor: '#FFB900',
              color: '#101D3B',
              fontWeight: 800,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        )}
        {isOutOfStock && (
          <Chip
            label="Sold Out"
            size="small"
            sx={{
              bgcolor: '#64748B',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        )}
      </Box>

      {/* Wishlist Button */}
      <Tooltip title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
        <IconButton
          size="small"
          onClick={handleToggleWishlist}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            color: isWishlisted ? '#EF4444' : 'text.secondary',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            '&:hover': {
              bgcolor: 'background.paper',
              color: '#EF4444',
              transform: 'scale(1.1)',
            },
          }}
          aria-label="Wishlist toggle"
        >
          {isWishlisted ? <FavoriteFilledIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {/* Image Container */}
      <Box
        sx={{
          width: '100%',
          pt: '92%', // 1:1.08 ratio
          position: 'relative',
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        <CardMedia
          component="img"
          image={primaryImage}
          alt={product.title}
          onError={handleImageError}
          className="product-card-img"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            p: 2,
            transition: 'transform 300ms ease',
          }}
          loading="lazy"
        />
      </Box>

      {/* Content */}
      <CardContent sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box>
          {/* Brand */}
          {product.brand ? (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 0.5,
              }}
            >
              {product.brand}
            </Typography>
          ) : null}

          {/* Title */}
          <Typography
            variant="subtitle2"
            sx={{
              color: 'text.primary',
              fontWeight: 700,
              fontSize: '0.92rem',
              lineHeight: 1.35,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.5rem',
            }}
          >
            {product.title}
          </Typography>

          {/* Rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
            {product.reviewCount > 0 ? (
              <>
                <Rating
                  value={product.averageRating || 0}
                  precision={0.5}
                  size="small"
                  readOnly
                  sx={{ color: '#FFB900', fontSize: '0.95rem' }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  ({product.reviewCount})
                </Typography>
              </>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontStyle: 'italic' }}>
                New item
              </Typography>
            )}
          </Box>
        </Box>

        {/* Price & Add to Cart Action */}
        <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                fontSize: '1.05rem',
              }}
            >
              ₦{effectivePrice.toLocaleString()}
            </Typography>
            {salePrice && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'line-through',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                ₦{regularPrice.toLocaleString()}
              </Typography>
            )}
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="small"
            disabled={isOutOfStock || isAdding}
            onClick={handleAddToCart}
            startIcon={<AddCartIcon sx={{ fontSize: '1rem !important' }} />}
            sx={{
              bgcolor: isOutOfStock ? '#E2E8F0' : '#1557D5',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.8rem',
              py: 0.85,
              borderRadius: '8px',
              '&:hover': {
                bgcolor: '#0E42A8',
              },
            }}
          >
            {isOutOfStock ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
