import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  Rating,
  Divider,
  Stack,
  IconButton,
  Tabs,
  Tab,
  Paper,
  TextField,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  Favorite as FavoriteFilledIcon,
  FavoriteBorder as FavoriteBorderIcon,
  LocalShippingOutlined as ShippingIcon,
  SecurityOutlined as SecurityIcon,
  AutorenewOutlined as ReturnsIcon,
  CheckCircle as InStockIcon,
  Warning as LowStockIcon,
  Cancel as OutOfStockIcon,
} from '@mui/icons-material';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { usePublicProduct, useRelatedProducts } from '@/hooks/useProducts';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist';
import { useAddToCart } from '@/hooks/useCart';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { reviewService } from '@/services/review.service';
import { ProductCard } from '@/components/common/ProductCard';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { ProductStatus } from '@shared/enums';
import type { ReviewDto, WishlistItemDto, ProductVariantDto } from '@shared/api.types';

export const ProductDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setCartDrawerOpen, showToast } = useUiStore();

  const { data: product, isLoading, error } = usePublicProduct(slug);
  const { data: relatedProducts = [] } = useRelatedProducts(slug, 4);
  const { data: wishlistData } = useWishlist({ enabled: isAuthenticated });
  const addToCartMutation = useAddToCart();
  const addToWishlistMutation = useAddToWishlist();
  const removeFromWishlistMutation = useRemoveFromWishlist();

  // Local component state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDto | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState<number | null>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Wishlist mapping
  const wishlistedItemsMap = new Map<string, string>();
  if (wishlistData?.data?.items) {
    wishlistData.data.items.forEach((item: WishlistItemDto) => {
      wishlistedItemsMap.set(item.productId, item.id);
    });
  }
  const isWishlisted = product ? wishlistedItemsMap.has(product.id) : false;
  const wishlistItemId = product ? wishlistedItemsMap.get(product.id) : undefined;

  // Initialize variant when product loads
  useEffect(() => {
    if (product?.hasVariants && product.variants?.length > 0) {
      setSelectedVariant(product.variants[0] || null);
    } else {
      setSelectedVariant(null);
    }
    setSelectedImageIndex(0);
    setQuantity(1);
  }, [product]);

  // Fetch reviews when product is loaded
  useEffect(() => {
    if (product?.id) {
      setReviewsLoading(true);
      reviewService
        .getProductReviews(product.id)
        .then((data) => setReviews(data || []))
        .catch(() => setReviews([]))
        .finally(() => setReviewsLoading(false));
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rounded" height={450} sx={{ borderRadius: '18px' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" width="40%" height={30} />
            <Skeleton variant="text" width="80%" height={50} sx={{ my: 1 }} />
            <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '12px', mb: 3 }} />
            <Skeleton variant="rectangular" height={50} width="60%" sx={{ borderRadius: '10px' }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#101D3B', mb: 2 }}>
          Product Not Found
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', mb: 4 }}>
          The product you are looking for may have been removed, renamed, or is temporarily unavailable.
        </Typography>
        <Button component={RouterLink} to="/shop" variant="contained" sx={{ bgcolor: '#1557D5' }}>
          Browse Catalog
        </Button>
      </Container>
    );
  }

  // Pricing calculations
  const regularPrice = selectedVariant?.price || product.regularPrice || 0;
  const salePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : null;
  const effectivePrice = salePrice || regularPrice;
  const discountPercent =
    salePrice && regularPrice > salePrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null;

  // Stock calculations
  const availableStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isOutOfStock = availableStock <= 0 || product.status === ProductStatus.UNPUBLISHED;
  const isLowStock = availableStock > 0 && availableStock <= (product.lowStockThreshold || 5);

  // Images list
  const allImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => getMediaUrl(img.url))
      : [getMediaUrl(product.mainImage?.url)];

  const currentDisplayImage = allImages[selectedImageIndex] || allImages[0];

  const handleQuantityChange = (delta: number) => {
    const next = quantity + delta;
    if (next >= 1 && next <= Math.max(1, availableStock)) {
      setQuantity(next);
    }
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    try {
      setIsAdding(true);
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity,
      });
      showToast(`Added ${quantity} × "${product.title}" to cart!`, 'success');
      setCartDrawerOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item to cart';
      showToast(msg, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    try {
      setIsAdding(true);
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity,
      });
      navigate('/checkout');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout unavailable';
      showToast(msg, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist.', 'info');
      navigate('/login');
      return;
    }

    try {
      if (isWishlisted && wishlistItemId) {
        await removeFromWishlistMutation.mutateAsync(wishlistItemId);
        showToast('Item removed from wishlist', 'info');
      } else {
        await addToWishlistMutation.mutateAsync({ productId: product.id });
        showToast('Item saved to wishlist', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update wishlist';
      showToast(msg, 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please sign in to write a review.', 'info');
      navigate('/login');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Please provide a comment for your review.', 'warning');
      return;
    }

    try {
      setSubmittingReview(true);
      const newRev = await reviewService.createReview(product.id, {
        rating: reviewRating || 5,
        title: reviewTitle.trim() || 'Customer Review',
        comment: reviewComment.trim(),
      });
      setReviews([newRev, ...reviews]);
      setReviewComment('');
      setReviewTitle('');
      showToast('Review submitted successfully! Thank you for your feedback.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not submit review';
      showToast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        {/* Breadcrumb Navigation */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            <Box component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#1557D5' } }}>
              Home
            </Box>{' '}
            / {' '}
            <Box component={RouterLink} to="/shop" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#1557D5' } }}>
              Shop
            </Box>{' '}
            / {' '}
            {product.category && (
              <>
                <Box
                  component={RouterLink}
                  to={`/shop?category=${product.category.slug}`}
                  sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#1557D5' } }}
                >
                  {product.category.name}
                </Box>{' '}
                / {' '}
              </>
            )}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {product.title}
            </Box>
          </Typography>
        </Box>

        {/* Product Showcase: Gallery + Details */}
        <Grid container spacing={5} sx={{ mb: 8 }}>
          {/* Left Column: Image Gallery */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                p: { xs: 2, sm: 4 },
                textAlign: 'center',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 320, sm: 440 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="img"
                  src={currentDisplayImage}
                  alt={product.title}
                  onError={handleImageError}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transition: 'transform 300ms ease',
                    '&:hover': { transform: 'scale(1.03)' },
                  }}
                />
              </Box>
            </Paper>

            {/* Thumbnail Navigation Strip */}
            {allImages.length > 1 && (
              <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', py: 1 }}>
                {allImages.map((imgUrl, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: selectedImageIndex === idx ? '#1557D5' : '#E2E8F0',
                      p: 0.5,
                      cursor: 'pointer',
                      bgcolor: '#FFFFFF',
                      transition: 'all 200ms ease',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      onError={handleImageError}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Right Column: Title, Price, Variations, Stock, Actions */}
          <Grid item xs={12} md={6}>
            <Box>
              {/* Category & Brand */}
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                {product.brand && (
                  <Chip
                    label={product.brand}
                    size="small"
                    sx={{ bgcolor: '#EEF4FF', color: '#1557D5', fontWeight: 700 }}
                  />
                )}
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  SKU: {selectedVariant?.sku || product.sku}
                </Typography>
              </Stack>

              {/* Title */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: 'text.primary',
                  fontSize: { xs: '1.7rem', md: '2.2rem' },
                  lineHeight: 1.25,
                  mb: 1.5,
                }}
              >
                {product.title}
              </Typography>

              {/* Ratings & Stock Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Rating value={product.averageRating || 4.5} precision={0.5} readOnly size="small" sx={{ color: '#FFB900' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {product.averageRating?.toFixed(1) || '4.5'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ({reviews.length || product.reviewCount || 0} reviews)
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />

                {/* Stock Status Badge */}
                {isOutOfStock ? (
                  <Chip
                    icon={<OutOfStockIcon fontSize="small" />}
                    label="Out of Stock"
                    color="default"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                ) : isLowStock ? (
                  <Chip
                    icon={<LowStockIcon fontSize="small" />}
                    label={`Low Stock: Only ${availableStock} left`}
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    icon={<InStockIcon fontSize="small" />}
                    label="In Stock & Ready to Ship"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              {/* Price Panel */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: 'action.hover',
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', fontSize: { xs: '1.9rem', md: '2.4rem' } }}>
                    ₦{effectivePrice.toLocaleString()}
                  </Typography>
                  {salePrice && (
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#94A3B8',
                        textDecoration: 'line-through',
                        fontWeight: 600,
                      }}
                    >
                      ₦{regularPrice.toLocaleString()}
                    </Typography>
                  )}
                  {discountPercent && (
                    <Chip
                      label={`Save ${discountPercent}%`}
                      size="small"
                      sx={{ bgcolor: '#EF4444', color: '#FFFFFF', fontWeight: 800, ml: 1 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                  Prices include all applicable import fees & VAT. Transparent Nigerian checkout.
                </Typography>
              </Paper>

              {/* Short Description */}
              <Typography variant="body1" sx={{ color: '#475569', mb: 3.5, lineHeight: 1.7 }}>
                {product.shortDescription}
              </Typography>

              {/* Variations Selector (if available) */}
              {product.hasVariants && product.variants?.length > 0 && (
                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101D3B', mb: 1.5 }}>
                    Available Option / Style:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {product.variants.map((v) => {
                      const vKey = v.id || v.variantId || v.sku;
                      const isSelected = (selectedVariant?.id || selectedVariant?.variantId || selectedVariant?.sku) === vKey;
                      return (
                        <Chip
                          key={vKey}
                          label={`${v.title || v.sku} (₦${v.price.toLocaleString()})`}
                          clickable
                          onClick={() => setSelectedVariant(v)}
                          sx={{
                            fontWeight: 700,
                            borderRadius: '10px',
                            py: 2,
                            px: 1,
                            bgcolor: isSelected ? '#1557D5' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#101D3B',
                            border: '1.5px solid',
                            borderColor: isSelected ? '#1557D5' : '#E2E8F0',
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {/* Quantity Selector & Action Buttons */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101D3B', mb: 1.5 }}>
                  Quantity:
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '10px',
                      bgcolor: '#FFFFFF',
                      p: 0.5,
                    }}
                  >
                    <IconButton
                      size="small"
                      disabled={quantity <= 1 || isOutOfStock}
                      onClick={() => handleQuantityChange(-1)}
                      aria-label="Decrease quantity"
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ px: 2, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>
                      {quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={quantity >= availableStock || isOutOfStock}
                      onClick={() => handleQuantityChange(1)}
                      aria-label="Increase quantity"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    ({availableStock} available in warehouse)
                  </Typography>
                </Stack>

                {/* Primary Cart & Buy Actions */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isOutOfStock || isAdding}
                    onClick={handleAddToCart}
                    startIcon={<CartIcon />}
                    sx={{
                      bgcolor: '#1557D5',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      py: 1.6,
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(21, 87, 213, 0.25)',
                      '&:hover': { bgcolor: '#0E42A8' },
                    }}
                  >
                    {isAdding ? 'Adding to Cart...' : 'Add to Cart'}
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isOutOfStock || isAdding}
                    onClick={handleBuyNow}
                    sx={{
                      bgcolor: '#FFB900',
                      color: '#101D3B',
                      fontWeight: 800,
                      py: 1.6,
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(255, 185, 0, 0.3)',
                      '&:hover': { bgcolor: '#E5A600' },
                    }}
                  >
                    Buy Now
                  </Button>

                  <Tooltip title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}>
                    <IconButton
                      onClick={handleToggleWishlist}
                      sx={{
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '12px',
                        p: 1.5,
                        color: isWishlisted ? '#EF4444' : '#64748B',
                        '&:hover': { borderColor: '#EF4444', color: '#EF4444' },
                      }}
                      aria-label="Wishlist toggle"
                    >
                      {isWishlisted ? <FavoriteFilledIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Value & Delivery Guarantees */}
              <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ShippingIcon sx={{ color: '#1557D5', fontSize: '1.2rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Doorstep delivery available across all 36 Nigerian states & FCT
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <SecurityIcon sx={{ color: '#1557D5', fontSize: '1.2rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      100% Secure Checkout powered by Paystack PCI-DSS certified gateway
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ReturnsIcon sx={{ color: '#1557D5', fontSize: '1.2rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      7-day return policy for unopened or defective products
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Tabbed Section: Description, Specifications, Reviews */}
        <Paper elevation={0} sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mb: 8, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              px: 2,
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.95rem',
                textTransform: 'none',
                py: 2,
              },
            }}
          >
            <Tab label="Full Description" />
            <Tab label="Specifications" />
            <Tab label={`Customer Reviews (${reviews.length})`} />
          </Tabs>

          <Box sx={{ p: { xs: 3, md: 5 } }}>
            {/* Tab 0: Description */}
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#101D3B', mb: 2 }}>
                  About this Product
                </Typography>
                <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {product.fullDescription || product.shortDescription}
                </Typography>
              </Box>
            )}

            {/* Tab 1: Specifications */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#101D3B', mb: 2 }}>
                  Technical & Physical Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Brand / Manufacturer
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {product.brand || 'Authentic Manufacturer'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Base SKU
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {product.sku}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Weight (Grams)
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {product.weightGrams ? `${product.weightGrams}g` : 'Standard parcel'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Dimensions
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {product.dimensions
                          ? `${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} ${product.dimensions.unit}`
                          : 'Retail packaging'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 2: Reviews */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Customer Feedback & Ratings
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Verified purchase reviews from Nigerian shoppers
                    </Typography>
                  </Box>
                </Box>

                {/* Review Form */}
                <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5 }}>
                    Write a Product Review
                  </Typography>
                  <Box component="form" onSubmit={handleReviewSubmit}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                        Your Rating:
                      </Typography>
                      <Rating
                        value={reviewRating}
                        onChange={(_, val) => setReviewRating(val)}
                        sx={{ color: '#FFB900' }}
                      />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Review Title (Optional)"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Share your experience with this item..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={submittingReview}
                          sx={{ bgcolor: '#1557D5', color: '#FFFFFF', fontWeight: 700 }}
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Existing Reviews List */}
                {reviewsLoading ? (
                  <Skeleton variant="rounded" height={100} sx={{ borderRadius: '12px' }} />
                ) : reviews.length > 0 ? (
                  <Stack spacing={2}>
                    {reviews.map((rev) => (
                      <Box key={rev.id} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Rating value={rev.rating} readOnly size="small" sx={{ color: '#FFB900' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {rev.title || 'Verified Review'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {rev.comment}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748B', py: 2 }}>
                    No customer reviews yet. Be the first to share your thoughts on this product!
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Related Products Section */}
        {relatedProducts && relatedProducts.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#101D3B', mb: 3 }}>
              Related Products You May Like
            </Typography>
            <Grid container spacing={3}>
              {relatedProducts.map((relProduct) => (
                <Grid item xs={12} sm={6} md={3} key={relProduct.id}>
                  <ProductCard
                    product={relProduct}
                    isWishlisted={wishlistedItemsMap.has(relProduct.id)}
                    wishlistItemId={wishlistedItemsMap.get(relProduct.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};
