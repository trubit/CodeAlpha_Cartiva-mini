import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  LocalShippingOutlined as ShippingIcon,
  VerifiedUserOutlined as SecurePaymentIcon,
  SupportAgentOutlined as SupportIcon,
  AutorenewOutlined as ReturnsIcon,
  StarOutlined as TrustIcon,
  Whatshot as FlameIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useFeaturedProducts, useNewArrivals } from '@/hooks/useProducts';
import { usePublicCategories } from '@/hooks/useCategories';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/stores/authStore';
import { ProductCard } from '@/components/common/ProductCard';
import { CategoryCard } from '@/components/common/CategoryCard';
import { DeliveryEstimatorWidget } from '@/components/shipping/DeliveryEstimatorWidget';
import type { WishlistItemDto } from '@shared/api.types';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = usePublicCategories();

  const {
    data: featuredProducts,
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedProducts(8);

  const {
    data: newArrivals,
    isLoading: newArrivalsLoading,
    isError: newArrivalsError,
    refetch: refetchNewArrivals,
  } = useNewArrivals(4);

  const { data: wishlistData } = useWishlist({ enabled: isAuthenticated });

  // Map of wishlisted product IDs to their wishlist item IDs
  const wishlistedItemsMap = new Map<string, string>();
  if (wishlistData?.data?.items) {
    wishlistData.data.items.forEach((item: WishlistItemDto) => {
      wishlistedItemsMap.set(item.productId, item.id);
    });
  }

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 10 }}>
      {/* =========================================================================
          1. HERO SECTION (Full Edge-to-Edge Background Image + Dark Gradient Overlay)
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ pt: { xs: 1.5, md: 3 }, pb: 3 }}>
        <Box
          sx={{
            borderRadius: { xs: '18px', md: '28px' },
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px -10px rgba(16, 29, 59, 0.45)',
            minHeight: { xs: 520, sm: 560, md: 620 },
            display: 'flex',
            alignItems: 'center',
            p: { xs: 3, sm: 5, md: 8 },
          }}
        >
          {/* 1A. Edge-to-Edge Hero Image Background */}
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1440&q=75&fm=webp"
            alt="Cartiva Mini Premium Lifestyle & Fashion Shopping"
            loading="eager"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: { xs: '70% center', sm: '75% center', md: 'right center' },
              zIndex: 0,
              transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          />

          {/* 1B. Professional Multi-Stop Transparent / Dark Gradient Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              background: {
                xs: 'linear-gradient(to right, rgba(16, 29, 59, 0.95) 0%, rgba(16, 29, 59, 0.88) 55%, rgba(16, 29, 59, 0.65) 100%)',
                sm: 'linear-gradient(to right, rgba(16, 29, 59, 0.94) 0%, rgba(16, 29, 59, 0.82) 48%, rgba(16, 29, 59, 0.40) 80%, rgba(16, 29, 59, 0.20) 100%)',
                md: 'linear-gradient(90deg, rgba(16, 29, 59, 0.96) 0%, rgba(16, 29, 59, 0.84) 42%, rgba(16, 29, 59, 0.45) 75%, rgba(16, 29, 59, 0.15) 100%)',
              },
            }}
          />

          {/* 1C. Floating Up to 70% OFF Promotional Badge */}
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 20, sm: 28, md: 40 },
              right: { xs: 20, sm: 32, md: 50 },
              zIndex: 3,
              width: { xs: 84, sm: 96, md: 112 },
              height: { xs: 84, sm: 96, md: 112 },
              borderRadius: '50%',
              bgcolor: '#FFB900',
              color: '#101D3B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              transform: 'rotate(12deg)',
              border: '3px solid #FFFFFF',
              textAlign: 'center',
              lineHeight: 1.1,
              transition: 'transform 300ms ease',
              '&:hover': {
                transform: 'rotate(0deg) scale(1.08)',
              },
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: { xs: '0.62rem', md: '0.75rem' }, textTransform: 'uppercase' }}>
              Up to
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.6rem' }, my: -0.3 }}>
              70%
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 900, fontSize: { xs: '0.62rem', md: '0.75rem' } }}>
              OFF
            </Typography>
          </Box>

          {/* 1D. Hero Content Layer On Top of Image */}
          <Box sx={{ position: 'relative', zIndex: 2, maxWidth: { xs: '100%', md: 680, lg: 740 }, py: { xs: 2, md: 4 } }}>
            {/* Welcome Pill Chip */}
            <Chip
              label="Welcome to Cartiva Mini"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: { xs: '0.75rem', sm: '0.82rem' },
                mb: { xs: 2, sm: 2.5 },
                px: 1.2,
                py: 2,
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />

            {/* Bold Magnetic Editorial Headline */}
            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.3rem', sm: '3.4rem', md: '4.2rem', lg: '4.6rem' },
                lineHeight: 1.05,
                letterSpacing: '-1.5px',
                mb: 2.5,
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
              }}
            >
              Shop Smart.{' '}
              <Box component="span" sx={{ color: '#FFB900', display: 'inline-block' }}>
                Live Better.
              </Box>
            </Typography>

            {/* Subtitle / Supporting Text */}
            <Typography
              variant="body1"
              sx={{
                color: '#F1F5F9',
                fontSize: { xs: '1rem', sm: '1.12rem', md: '1.25rem' },
                lineHeight: 1.6,
                maxWidth: 580,
                mb: { xs: 3.5, sm: 4.5 },
                fontWeight: 400,
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
              }}
            >
              Discover amazing products, unbeatable prices, and fast delivery — all in one place.
            </Typography>

            {/* Calls to Action */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: { xs: 4, sm: 5 } }}>
              <Button
                component={RouterLink}
                to="/shop"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#FFB900',
                  color: '#101D3B',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  py: 1.6,
                  px: 4,
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(255, 185, 0, 0.4)',
                  '&:hover': {
                    bgcolor: '#E5A600',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 28px rgba(255, 185, 0, 0.5)',
                  },
                }}
              >
                Shop Now
              </Button>
              <Button
                component={RouterLink}
                to="/shop?filter=deals"
                variant="outlined"
                sx={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  borderWidth: '1.5px',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  py: 1.6,
                  px: 3.5,
                  borderRadius: '12px',
                  backdropFilter: 'blur(6px)',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    borderColor: '#FFFFFF',
                    borderWidth: '1.5px',
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Explore Deals
              </Button>
            </Stack>

            {/* Bottom Quick-Jump Category Pill Dock */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.2,
                pt: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', mr: 0.5 }}>
                Popular:
              </Typography>
              {['Electronics', 'Fashion', 'Home Living', 'Flash Deals'].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  component={RouterLink}
                  to={`/shop?category=${tag.toLowerCase().replace(' ', '-')}`}
                  clickable
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.14)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      bgcolor: '#FFB900',
                      color: '#101D3B',
                      borderColor: '#FFB900',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* =========================================================================
          2. BENEFITS & TRUST BAR (5 Key Customer Value Pillars)
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ mb: 6 }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2.5, md: 3 },
            boxShadow: '0 4px 16px rgba(16, 29, 59, 0.04)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={4} md={2.4}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#1557D5', bgcolor: 'rgba(21, 87, 213, 0.1)', p: 1.2, borderRadius: '10px' }}>
                  <ShippingIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                    Fast & Reliable
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Express Delivery
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={6} sm={4} md={2.4}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#1557D5', bgcolor: 'rgba(21, 87, 213, 0.1)', p: 1.2, borderRadius: '10px' }}>
                  <SecurePaymentIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                    Secure Payments
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Paystack Verified
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={6} sm={4} md={2.4}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#1557D5', bgcolor: 'rgba(21, 87, 213, 0.1)', p: 1.2, borderRadius: '10px' }}>
                  <SupportIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                    24/7 Support
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Helpful Customer Care
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={6} sm={4} md={2.4}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#1557D5', bgcolor: 'rgba(21, 87, 213, 0.1)', p: 1.2, borderRadius: '10px' }}>
                  <ReturnsIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                    Easy Returns
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    7-Day Return Policy
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4} md={2.4}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#FFB900', bgcolor: 'rgba(255, 185, 0, 0.15)', p: 1.2, borderRadius: '10px' }}>
                  <TrustIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                    Trusted Nationwide
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Guaranteed Authentic
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* =========================================================================
          3. SHOP BY CATEGORY SECTION
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ mb: 7 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.5rem', md: '1.9rem' } }}>
              Shop by Category
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
              Find exactly what you need from our verified departments
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/shop"
            endIcon={<ArrowForwardIcon />}
            sx={{
              color: '#1557D5',
              fontWeight: 700,
              fontSize: '0.9rem',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            View All Categories
          </Button>
        </Box>

        {categoriesLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: '18px' }} />
              </Grid>
            ))}
          </Grid>
        ) : categoriesError ? (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Unable to load product categories right now.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => void refetchCategories()} sx={{ fontWeight: 700 }}>
              Try Again
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {categories.slice(0, 8).map((cat) => (
              <Grid item xs={6} sm={4} md={3} lg={1.5} key={cat.id}>
                <CategoryCard category={cat} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* =========================================================================
          4. BEST SELLERS / FEATURED PRODUCTS SECTION
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ mb: 8 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ color: '#EF4444', display: 'flex', alignItems: 'center' }}>
              <FlameIcon sx={{ fontSize: '2rem' }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.5rem', md: '1.9rem' } }}>
                Best Sellers
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2, fontWeight: 500 }}>
                Our most popular and highly rated products
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/shop"
            endIcon={<ArrowForwardIcon />}
            sx={{
              color: '#1557D5',
              fontWeight: 700,
              fontSize: '0.9rem',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            View All Products
          </Button>
        </Box>

        {featuredLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={340} sx={{ borderRadius: '16px' }} />
              </Grid>
            ))}
          </Grid>
        ) : featuredError ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Unable to load best sellers right now.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => void refetchFeatured()} sx={{ fontWeight: 700 }}>
              Try Again
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 8).map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <ProductCard
                    product={product}
                    isWishlisted={wishlistedItemsMap.has(product.id)}
                    wishlistItemId={wishlistedItemsMap.get(product.id)}
                  />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                    No featured products available at this time.
                  </Typography>
                  <Button component={RouterLink} to="/shop" sx={{ mt: 2, color: 'primary.main', fontWeight: 700 }}>
                    Browse all catalog items →
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </Container>

      {/* =========================================================================
          5. PROMOTIONAL SPLIT BANNER (Summer Sale / Deals Callout)
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ mb: 8 }}>
        <Box
          sx={{
            borderRadius: '20px',
            bgcolor: '#101D3B',
            color: '#FFFFFF',
            p: { xs: 3, md: 5 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Chip
                label="Special Promotion"
                size="small"
                sx={{ bgcolor: '#FFB900', color: '#101D3B', fontWeight: 800, mb: 1.5 }}
              />
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.6rem' }, mb: 1, color: '#FFFFFF' }}>
                Unbeatable Deals on Everyday Tech & Fashion
              </Typography>
              <Typography variant="body1" sx={{ color: '#CBD5E1', maxWidth: 580, mb: 3 }}>
                Upgrade your lifestyle with authentic quality electronics, wear the latest trends, and save up to 50% on select catalog essentials.
              </Typography>
              <Button
                component={RouterLink}
                to="/shop?filter=deals"
                variant="contained"
                sx={{
                  bgcolor: '#1557D5',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  px: 3.5,
                  py: 1.2,
                  borderRadius: '10px',
                  '&:hover': { bgcolor: '#0E42A8' },
                }}
              >
                Explore Sale Items →
              </Button>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80"
                alt="Smart electronics promo"
                sx={{
                  width: '100%',
                  height: 220,
                  objectFit: 'cover',
                  borderRadius: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* =========================================================================
          6. NEW ARRIVALS & DELIVERY ESTIMATOR
          ========================================================================= */}
      <Container maxWidth="xl" sx={{ mb: 6 }}>
        <Grid container spacing={4}>
          {/* New Arrivals Column */}
          <Grid item xs={12} lg={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
                  Fresh Arrivals
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Recently added to our inventory
                </Typography>
              </Box>
              <Button component={RouterLink} to="/shop?sort=newest" sx={{ color: '#1557D5', fontWeight: 700 }}>
                View All New →
              </Button>
            </Box>

            {newArrivalsLoading ? (
              <Grid container spacing={2.5}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Skeleton variant="rounded" height={320} sx={{ borderRadius: '16px' }} />
                  </Grid>
                ))}
              </Grid>
            ) : newArrivalsError ? (
              <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                  Unable to load fresh arrivals right now.
                </Typography>
                <Button size="small" variant="outlined" onClick={() => void refetchNewArrivals()} sx={{ fontWeight: 700 }}>
                  Try Again
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2.5}>
                {newArrivals && newArrivals.length > 0 ? (
                  newArrivals.slice(0, 4).map((product) => (
                    <Grid item xs={12} sm={6} key={product.id}>
                      <ProductCard
                        product={product}
                        isWishlisted={wishlistedItemsMap.has(product.id)}
                        wishlistItemId={wishlistedItemsMap.get(product.id)}
                      />
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 4 }}>
                      Check back soon for upcoming product drops.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </Grid>

          {/* Delivery Estimator Column */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Instant Shipping Estimator
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, fontWeight: 500 }}>
                Calculate realistic doorstep delivery costs to your Nigerian state
              </Typography>
            </Box>
            <DeliveryEstimatorWidget />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
