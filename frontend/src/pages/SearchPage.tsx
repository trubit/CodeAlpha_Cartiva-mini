import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  InputBase,
  Button,
  Pagination,
  Skeleton,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useProductSearch } from '@/hooks/useProducts';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/stores/authStore';
import { ProductCard } from '@/components/common/ProductCard';
import { ProductSortOption } from '@shared/enums';
import type { WishlistItemDto } from '@shared/api.types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { data: wishlistData } = useWishlist({ enabled: isAuthenticated });

  const queryParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const sortParam = (searchParams.get('sort') as ProductSortOption) || ProductSortOption.RELEVANCE;

  const [searchInput, setSearchInput] = useState(queryParam);
  const [page, setPage] = useState(pageParam);
  const [sort, setSort] = useState<ProductSortOption>(sortParam);

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
    setSort((searchParams.get('sort') as ProductSortOption) || ProductSortOption.RELEVANCE);
  }, [searchParams]);

  const { data: searchResult, isLoading } = useProductSearch({
    search: queryParam,
    page,
    limit: 12,
    sort,
  }, {
    enabled: Boolean(queryParam.trim()),
  });

  const products = searchResult?.products || [];
  const pagination = searchResult?.pagination;
  const totalItems = pagination?.total || products.length;
  const totalPages = pagination?.totalPages || 1;

  // Wishlist mapping
  const wishlistedItemsMap = new Map<string, string>();
  if (wishlistData?.data?.items) {
    wishlistData.data.items.forEach((item: WishlistItemDto) => {
      wishlistedItemsMap.set(item.productId, item.id);
    });
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim(), page: '1' });
    }
  };

  const handleSortChange = (newSort: ProductSortOption) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 }, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Search Input Hero Box */}
        <Box sx={{ maxWidth: 700, mx: 'auto', mb: 5, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, color: 'text.primary', mb: 1, fontSize: { xs: '1.6rem', md: '2.2rem' } }}
          >
            Search Cartiva Mini
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontWeight: 500 }}>
            Find products, electronics, essentials, and genuine brands across our platform
          </Typography>

          <Paper
            component="form"
            onSubmit={handleSearchSubmit}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: '9999px',
              border: '2px solid',
              borderColor: 'divider',
              p: '4px 8px 4px 20px',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 18px rgba(16, 29, 59, 0.08)',
              '&:focus-within': {
                borderColor: '#1557D5',
                boxShadow: '0 0 0 4px rgba(21, 87, 213, 0.15)',
              },
            }}
          >
            <InputBase
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by keywords, brand, SKU or title..."
              sx={{ flex: 1, fontSize: '1rem', color: 'text.primary' }}
              inputProps={{ 'aria-label': 'Search products' }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: '#1557D5',
                color: '#FFFFFF',
                borderRadius: '9999px',
                px: 3,
                py: 1,
                fontWeight: 700,
                '&:hover': { bgcolor: '#0E42A8' },
              }}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Paper>
        </Box>

        {/* Results Metadata & Sorting */}
        {queryParam && (
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
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Results for &quot;<Box component="span" sx={{ color: '#1557D5' }}>{queryParam}</Box>&quot;
              <Chip
                label={`${totalItems} items`}
                size="small"
                sx={{ ml: 1.5, bgcolor: '#EEF4FF', color: '#1557D5', fontWeight: 700 }}
              />
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                Sort:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as ProductSortOption)}
                  sx={{ borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}
                >
                  <MenuItem value={ProductSortOption.RELEVANCE}>Best Match</MenuItem>
                  <MenuItem value={ProductSortOption.NEWEST}>Newest Arrivals</MenuItem>
                  <MenuItem value={ProductSortOption.PRICE_ASC}>Price: Low to High</MenuItem>
                  <MenuItem value={ProductSortOption.PRICE_DESC}>Price: High to Low</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        )}

        {/* Product Cards Grid or Empty State */}
        {isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={360} sx={{ borderRadius: '16px' }} />
              </Grid>
            ))}
          </Grid>
        ) : products.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <ProductCard
                    product={product}
                    isWishlisted={wishlistedItemsMap.has(product.id)}
                    wishlistItemId={wishlistedItemsMap.get(product.id)}
                  />
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
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
        ) : queryParam ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 3,
              bgcolor: 'background.paper',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: '#FFB900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <SearchOffIcon sx={{ fontSize: '2.2rem' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              No matches found for &quot;{queryParam}&quot;
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto', mb: 3 }}>
              Double check your spelling or search with broader keywords such as &quot;watch&quot;, &quot;headphone&quot;, &quot;phone&quot;, or &quot;bag&quot;.
            </Typography>
            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              sx={{ bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700 }}
            >
              Browse Full Catalog
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="subtitle1" sx={{ color: '#64748B' }}>
              Enter a search keyword above to discover products.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};
