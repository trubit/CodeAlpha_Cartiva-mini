import { apiClient } from './api.js';
import type {
  ApiResponse,
  CategoryDto,
  CategoryWithChildrenDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductFilterQueryDto,
  PaginatedProductsDto,
  ProductListItemDto,
} from '@shared/api.types.js';

export const categoryService = {
  // Public
  async getPublicCategories(): Promise<CategoryWithChildrenDto[]> {
    const response = await apiClient.get<ApiResponse<CategoryWithChildrenDto[]>>('/categories');
    return response.data.data;
  },

  async getPublicCategoryBySlug(slug: string): Promise<CategoryDto> {
    const response = await apiClient.get<ApiResponse<CategoryDto>>(`/categories/${slug}`);
    return response.data.data;
  },

  async getCategoryProducts(
    slug: string,
    params?: ProductFilterQueryDto
  ): Promise<PaginatedProductsDto> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>(
      `/categories/${slug}/products`,
      { params }
    );
    return {
      products: response.data.data,
      pagination: response.data.meta!,
    };
  },

  // Admin
  async getAdminCategories(): Promise<CategoryDto[]> {
    const response = await apiClient.get<ApiResponse<CategoryDto[]>>('/admin/categories');
    return response.data.data;
  },

  async getAdminCategoryById(categoryId: string): Promise<CategoryDto> {
    const response = await apiClient.get<ApiResponse<CategoryDto>>(
      `/admin/categories/${categoryId}`
    );
    return response.data.data;
  },

  async createCategory(dto: CreateCategoryDto): Promise<CategoryDto> {
    const response = await apiClient.post<ApiResponse<CategoryDto>>('/admin/categories', dto);
    return response.data.data;
  },

  async updateCategory(categoryId: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const response = await apiClient.patch<ApiResponse<CategoryDto>>(
      `/admin/categories/${categoryId}`,
      dto
    );
    return response.data.data;
  },

  async updateCategoryStatus(categoryId: string, isActive: boolean): Promise<CategoryDto> {
    const response = await apiClient.patch<ApiResponse<CategoryDto>>(
      `/admin/categories/${categoryId}/status`,
      { isActive }
    );
    return response.data.data;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/admin/categories/${categoryId}`);
  },
};
