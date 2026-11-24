import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service.js';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterQueryDto,
} from '@shared/api.types.js';
import type { ProductStatus } from '@shared/enums.js';

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  publicList: (params?: ProductFilterQueryDto) =>
    [...PRODUCT_QUERY_KEYS.all, 'public', params] as const,
  search: (params?: ProductFilterQueryDto) =>
    [...PRODUCT_QUERY_KEYS.all, 'search', params] as const,
  suggestions: (query: string, limit?: number) =>
    [...PRODUCT_QUERY_KEYS.all, 'suggestions', query, limit] as const,
  newArrivals: (limit?: number) => [...PRODUCT_QUERY_KEYS.all, 'newArrivals', limit] as const,
  categoryProducts: (slug: string, params?: ProductFilterQueryDto) =>
    [...PRODUCT_QUERY_KEYS.all, 'category', slug, params] as const,
  detail: (slug: string) => [...PRODUCT_QUERY_KEYS.all, 'detail', slug] as const,
  featured: () => [...PRODUCT_QUERY_KEYS.all, 'featured'] as const,
  related: (slug: string) => [...PRODUCT_QUERY_KEYS.all, 'related', slug] as const,
  adminList: (params?: Record<string, unknown>) =>
    [...PRODUCT_QUERY_KEYS.all, 'admin', params] as const,
  adminDetail: (id: string) => [...PRODUCT_QUERY_KEYS.all, 'admin', id] as const,
};

export const usePublicProducts = (params?: ProductFilterQueryDto) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.publicList(params),
    queryFn: () => productService.getPublicProducts(params),
  });
};

export const useProductSearch = (
  params?: ProductFilterQueryDto,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.search(params),
    queryFn: () => productService.searchProducts(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
};

export const useSearchSuggestions = (query: string, limit = 5, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.suggestions(query, limit),
    queryFn: () => productService.getSuggestions(query, limit),
    enabled:
      options?.enabled !== undefined ? options.enabled : Boolean(query && query.trim().length >= 1),
    staleTime: 60 * 1000,
  });
};

export const useNewArrivals = (limit = 8) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.newArrivals(limit),
    queryFn: () => productService.getNewArrivals(limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCategoryProducts = (
  slug: string,
  params?: ProductFilterQueryDto,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.categoryProducts(slug, params),
    queryFn: () => productService.getCategoryProducts(slug, params),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(slug),
  });
};

export const usePublicProduct = (slug: string) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(slug),
    queryFn: () => productService.getPublicProductBySlug(slug),
    enabled: Boolean(slug),
  });
};

export const useFeaturedProducts = (limit = 8) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.featured(),
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRelatedProducts = (slug: string, limit = 4) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.related(slug),
    queryFn: () => productService.getRelatedProducts(slug, limit),
    enabled: Boolean(slug),
  });
};

export const useAdminProducts = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.adminList(params),
    queryFn: () => productService.getAdminProducts(params),
  });
};

export const useAdminProduct = (id: string) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.adminDetail(id),
    queryFn: () => productService.getAdminProductById(id),
    enabled: Boolean(id),
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductDto) => productService.createProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) =>
      productService.updateProduct(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productService.updateProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useUploadProductImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      file,
      options,
    }: {
      productId: string;
      file: File;
      options?: { isThumbnail?: boolean; displayOrder?: number; alt?: string };
    }) => productService.uploadProductImage(productId, file, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useRemoveProductImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      productService.removeProductImage(productId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};

export const useSetPrimaryProductImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      productService.setPrimaryProductImage(productId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
};
