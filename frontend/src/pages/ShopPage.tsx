import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Pagination,
  Skeleton,
  Chip,
  IconButton,
  Drawer,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon,
  RestartAlt as ResetIcon,
  Storefront as ShopIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { usePublicProducts } from '@/hooks/useProducts';
import { usePublicCategories } from '@/hooks/useCategories';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/stores/authStore';
import { ProductCard } from '@/components/common/ProductCard';
import { ProductSortOption, ProductAvailabilityFilter } from '@shared/enums';
import type { WishlistItemDto } from '@shared/api.types';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { data: categories = [] } = usePublicCategories();
  const { data: wishlistData } = useWishlist({ enabled: isAuthenticated });

  // Read URL params or fallback to defaults
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const categoryParam = searchParams.get('category') || '';
  const sortParam = (searchParams.get('sort') as ProductSortOption) || ProductSortOption.NEWEST;
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const availabilityParam =
    (searchParams.get('availability') as ProductAvailabilityFilter) ||
    ProductAvailabilityFilter.ALL;

  // Local state for filters
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedSort, setSelectedSort] = useState<ProductSortOption>(sortParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [availability, setAvailability] = useState<ProductAvailabilityFilter>(availabilityParam);
  const [page, setPage] = useState(pageParam);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || '');
    setSelectedSort(
      (searchParams.get('sort') as ProductSortOption) || ProductSortOption.NEWEST
    );
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setAvailability(
      (searchParams.get('availability') as ProductAvailabilityFilter) ||
        ProductAvailabilityFilter.ALL
    );
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Query backend products
  const { data: productsData, isLoading } = usePublicProducts({
    page,
    limit: 12,
    sort: selectedSort,
    category: selectedCategory || undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    availability: availability !== ProductAvailabilityFilter.ALL ? availability : undefined,
  });

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || products.length;

  // Wishlist mapping
  const wishlistedItemsMap = new Map<string, string>();
  if (wishlistData?.data?.items) {
    wishlistData.data.items.forEach((item: WishlistItemDto) => {
      wishlistedItemsMap.set(item.productId, item.id);
    });
  }

  // Apply filters and update URL
  const updateUrlParams = (newParams: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === '') {
        nextParams.delete(k);
      } else {
        nextParams.set(k, v);
      }
    });
    setSearchParams(nextParams);
  };

  const handleCategoryChange = (slug: string) => {
    const next = selectedCategory === slug ? '' : slug;
    setSelectedCategory(next);
    setPage(1);
    updateUrlParams({ category: next || null, page: '1' });
  };

  const handleSortChange = (sort: ProductSortOption) => {
    setSelectedSort(sort);
    setPage(1);
    updateUrlParams({ sort, page: '1' });
  };

  const handlePriceApply = () => {
    setPage(1);
    updateUrlParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      page: '1',
    });
  };

  const handleAvailabilityChange = (val: ProductAvailabilityFilter) => {
    setAvailability(val);
    setPage(1);
    updateUrlParams({
      availability: val !== ProductAvailabilityFilter.ALL ? val : null,
      page: '1',
    });
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setAvailability(ProductAvailabilityFilter.ALL);
    setSelectedSort(ProductSortOption.NEWEST);
    setPage(1);
    setSearchParams({});
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reusable Filter Sidebar Content
  const filterContent = (
    <Box sx={{ width: { xs: 280, md: '100%' }, p: { xs: 3, md: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Filters
        </Typography>
        <Button
          size="small"
          onClick={handleResetFilters}
          startIcon={<ResetIcon />}
          sx={{ color: '#EF4444', fontWeight: 600, fontSize: '0.78rem' }}
        >
          Reset All
        </Button>
      </Box>

      {/* Category Filter */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
          Category
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Chip
            label="All Categories"
            clickable
            color={!selectedCategory ? 'primary' : 'default'}
            onClick={() => handleCategoryChange('')}
            sx={{
              justifyContent: 'flex-start',
              fontWeight: 600,
              bgcolor: !selectedCategory ? '#1557D5' : 'action.hover',
              color: !selectedCategory ? '#FFFFFF' : 'text.primary',
            }}
          />
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <Chip
                key={cat.id}
                label={cat.name}
                clickable
                onClick={() => handleCategoryChange(cat.slug)}
                sx={{
                  justifyContent: 'flex-start',
                  fontWeight: 600,
                  bgcolor: isSelected ? '#1557D5' : 'action.hover',
                  color: isSelected ? '#FFFFFF' : 'text.primary',
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* Price Range Filter */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
          Price Range (₦)
        </Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={6}>
            <TextField
              size="small"
              placeholder="Min"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              placeholder="Max"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={handlePriceApply}
              sx={{ borderColor: '#1557D5', color: '#1557D5', fontWeight: 700, mt: 1 }}
            >
              Apply Price
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* Stock Availability Filter */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Availability
        </Typography>
        <RadioGroup
          value={availability}
          onChange={(e) => handleAvailabilityChange(e.target.value as ProductAvailabilityFilter)}
        >
          <FormControlLabel
            value={ProductAvailabilityFilter.ALL}
            control={<Radio size="small" />}
            label={<Typography variant="body2">All Items</Typography>}
          />
          <FormControlLabel
            value={ProductAvailabilityFilter.IN_STOCK}
            control={<Radio size="small" />}
            label={<Typography variant="body2">In Stock Only</Typography>}
          />
        </RadioGroup>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Breadcrumb & Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Home / Shop / {selectedCategory ? selectedCategory.replace('-', ' ') : 'All Products'}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: 'text.primary',
              mt: 0.5,
              fontSize: { xs: '1.8rem', md: '2.4rem' },
            }}
          >
            {selectedCategory ? `${selectedCategory.toUpperCase()} Catalog` : 'Explore Products'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
            Showing {totalItems} verified items with direct doorstep delivery across Nigeria
          </Typography>
        </Box>

        {/* Toolbar: Filter Toggle on mobile & Sort select */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 4,
            borderRadius: '14px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {/* Mobile Filter Button */}
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setMobileFilterOpen(true)}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              color: 'text.primary',
              borderColor: 'divider',
            }}
          >
            Filters
          </Button>

          {/* Active Filter Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {selectedCategory && (
              <Chip
                label={`Category: ${selectedCategory}`}
                onDelete={() => handleCategoryChange('')}
                size="small"
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(21, 87, 213, 0.25)' : '#EEF4FF'),
                  color: (theme) => (theme.palette.mode === 'dark' ? '#93C5FD' : '#1557D5'),
                  fontWeight: 600,
                }}
              />
            )}
            {(minPrice || maxPrice) && (
              <Chip
                label={`Price: ₦${minPrice || 0} - ₦${maxPrice || '∞'}`}
                onDelete={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateUrlParams({ minPrice: null, maxPrice: null });
                }}
                size="small"
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(21, 87, 213, 0.25)' : '#EEF4FF'),
                  color: (theme) => (theme.palette.mode === 'dark' ? '#93C5FD' : '#1557D5'),
                  fontWeight: 600,
                }}
              />
            )}
            {availability === ProductAvailabilityFilter.IN_STOCK && (
              <Chip
                label="In Stock Only"
                onDelete={() => handleAvailabilityChange(ProductAvailabilityFilter.ALL)}
                size="small"
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(21, 87, 213, 0.25)' : '#EEF4FF'),
                  color: (theme) => (theme.palette.mode === 'dark' ? '#93C5FD' : '#1557D5'),
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          {/* Sort Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              Sort by:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                value={selectedSort}
                onChange={(e) => handleSortChange(e.target.value as ProductSortOption)}
                sx={{ borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}
              >
                <MenuItem value={ProductSortOption.NEWEST}>Newest Arrivals</MenuItem>
                <MenuItem value={ProductSortOption.PRICE_ASC}>Price: Low to High</MenuItem>
                <MenuItem value={ProductSortOption.PRICE_DESC}>Price: High to Low</MenuItem>
                <MenuItem value={ProductSortOption.NAME_ASC}>Name: A to Z</MenuItem>
                <MenuItem value={ProductSortOption.POPULAR}>Popularity</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Main Grid: Sidebar Filters (desktop) + Products Grid */}
        <Grid container spacing={4}>
          {/* Desktop Filter Sidebar */}
          <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '16px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                position: 'sticky',
                top: 90,
              }}
            >
              {filterContent}
            </Paper>
          </Grid>

          {/* Products Column */}
          <Grid item xs={12} md={9}>
            {isLoading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid item xs={12} sm={6} lg={4} key={i}>
                    <Skeleton variant="rounded" height={360} sx={{ borderRadius: '16px' }} />
                  </Grid>
                ))}
              </Grid>
            ) : products.length > 0 ? (
              <>
                <Grid container spacing={3}>
                  {products.map((product) => (
                    <Grid item xs={12} sm={6} lg={4} key={product.id}>
                      <ProductCard
                        product={product}
                        isWishlisted={wishlistedItemsMap.has(product.id)}
                        wishlistItemId={wishlistedItemsMap.get(product.id)}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 2 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      sx={{
                        '& .MuiPaginationItem-root.Mui-selected': {
                          bgcolor: '#1557D5',
                          color: '#FFFFFF',
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            ) : (
              /* No Results State */
              <Box
                sx={{
                  textAlign: 'center',
                  py: 10,
                  px: 3,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#111827' : '#FFFFFF'),
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: (theme) => (theme.palette.mode === 'dark' ? '#1F2937' : '#E2E8F0'),
                  color: 'text.primary',
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'action.hover'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    color: 'text.secondary',
                  }}
                >
                  <ShopIcon sx={{ fontSize: '2rem' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  No Products Found
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 450, mx: 'auto', mb: 3 }}>
                  We couldn&apos;t find any items matching your selected criteria. Try adjusting or clearing your filters to see more results.
                </Typography>
                <Button variant="contained" onClick={handleResetFilters} sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700 }}>
                  Clear All Filters
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Mobile Filters Drawer */}
      <Drawer
        anchor="left"
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        PaperProps={{ sx: { width: 310, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Filter Catalog
          </Typography>
          <IconButton onClick={() => setMobileFilterOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2 }}>{filterContent}</Box>
      </Drawer>
    </Box>
  );
};
