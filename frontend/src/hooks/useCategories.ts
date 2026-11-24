import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/category.service.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductFilterQueryDto,
} from '@shared/api.types.js';

export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  publicList: () => [...CATEGORY_QUERY_KEYS.all, 'public'] as const,
  detail: (slug: string) => [...CATEGORY_QUERY_KEYS.all, 'detail', slug] as const,
  products: (slug: string, params?: ProductFilterQueryDto) =>
    [...CATEGORY_QUERY_KEYS.all, 'products', slug, params] as const,
  adminList: () => [...CATEGORY_QUERY_KEYS.all, 'admin'] as const,
  adminDetail: (id: string) => [...CATEGORY_QUERY_KEYS.all, 'admin', id] as const,
};

export const usePublicCategories = () => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.publicList(),
    queryFn: () => categoryService.getPublicCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

export const usePublicCategory = (slug: string) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.detail(slug),
    queryFn: () => categoryService.getPublicCategoryBySlug(slug),
    enabled: Boolean(slug),
  });
};

export const useCategoryProducts = (
  slug: string,
  params?: ProductFilterQueryDto,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.products(slug, params),
    queryFn: () => categoryService.getCategoryProducts(slug, params),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(slug),
  });
};

export const useAdminCategories = () => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.adminList(),
    queryFn: () => categoryService.getAdminCategories(),
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => categoryService.createCategory(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      categoryService.updateCategory(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });
};

export const useUpdateCategoryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoryService.updateCategoryStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
    },
  });
};
