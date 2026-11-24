import { apiClient } from './api.js';
import type {
  ApiResponse,
  ProductDto,
  ProductListItemDto,
  PaginatedProductsDto,
  CreateProductDto,
  UpdateProductDto,
  ProductSuggestionsDto,
  ProductSearchResponseDto,
  ProductFilterQueryDto,
} from '@shared/api.types.js';
import type { ProductStatus } from '@shared/enums.js';

export const productService = {
  // Public
  async getPublicProducts(params?: ProductFilterQueryDto): Promise<PaginatedProductsDto> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>('/products', {
      params,
    });
    return {
      products: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async searchProducts(params?: ProductFilterQueryDto): Promise<ProductSearchResponseDto> {
    const response = await apiClient.get<
      ApiResponse<{
        products: ProductListItemDto[];
        facets: ProductSearchResponseDto['facets'];
        query: string;
      }>
    >('/products/search', {
      params,
    });
    return {
      products: response.data.data.products,
      facets: response.data.data.facets,
      query: response.data.data.query,
      pagination: response.data.meta!,
    };
  },

  async getSuggestions(query: string, limit = 5): Promise<ProductSuggestionsDto> {
    const response = await apiClient.get<ApiResponse<ProductSuggestionsDto>>(
      '/products/suggestions',
      {
        params: { q: query, limit },
      }
    );
    return response.data.data;
  },

  async getNewArrivals(limit = 8): Promise<ProductListItemDto[]> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>(
      '/products/new-arrivals',
      {
        params: { limit },
      }
    );
    return response.data.data;
  },

  async getCategoryProducts(
    slug: string,
    params?: ProductFilterQueryDto
  ): Promise<PaginatedProductsDto> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>(
      `/categories/${slug}/products`,
      {
        params,
      }
    );
    return {
      products: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getPublicProductBySlug(slug: string): Promise<ProductDto> {
    const response = await apiClient.get<ApiResponse<ProductDto>>(`/products/${slug}`);
    return response.data.data;
  },

  async getFeaturedProducts(limit = 8): Promise<ProductListItemDto[]> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>('/products/featured', {
      params: { limit },
    });
    return response.data.data;
  },

  async getRelatedProducts(slug: string, limit = 4): Promise<ProductListItemDto[]> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>(
      `/products/${slug}/related`,
      {
        params: { limit },
      }
    );
    return response.data.data;
  },

  // Admin
  async getAdminProducts(params?: Record<string, unknown>): Promise<PaginatedProductsDto> {
    const response = await apiClient.get<ApiResponse<ProductListItemDto[]>>('/admin/products', {
      params,
    });
    return {
      products: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getAdminProductById(productId: string): Promise<ProductDto> {
    const response = await apiClient.get<ApiResponse<ProductDto>>(`/admin/products/${productId}`);
    return response.data.data;
  },

  async createProduct(dto: CreateProductDto): Promise<ProductDto> {
    const response = await apiClient.post<ApiResponse<ProductDto>>('/admin/products', dto);
    return response.data.data;
  },

  async updateProduct(productId: string, dto: UpdateProductDto): Promise<ProductDto> {
    const response = await apiClient.patch<ApiResponse<ProductDto>>(
      `/admin/products/${productId}`,
      dto
    );
    return response.data.data;
  },

  async updateProductStatus(productId: string, status: ProductStatus): Promise<ProductDto> {
    const response = await apiClient.patch<ApiResponse<ProductDto>>(
      `/admin/products/${productId}/status`,
      {
        status,
      }
    );
    return response.data.data;
  },

  async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/admin/products/${productId}`);
  },

  async uploadProductImage(
    productId: string,
    file: File,
    options?: { isThumbnail?: boolean; displayOrder?: number; alt?: string }
  ): Promise<ProductDto> {
    const formData = new FormData();
    formData.append('image', file);
    if (options?.isThumbnail !== undefined) {
      formData.append('isThumbnail', String(options.isThumbnail));
    }
    if (options?.displayOrder !== undefined) {
      formData.append('displayOrder', String(options.displayOrder));
    }
    if (options?.alt) {
      formData.append('alt', options.alt);
    }

    const response = await apiClient.post<ApiResponse<ProductDto>>(
      `/admin/products/${productId}/images`,
      formData
    );
    return response.data.data;
  },

  async removeProductImage(productId: string, imageId: string): Promise<ProductDto> {
    const response = await apiClient.delete<ApiResponse<ProductDto>>(
      `/admin/products/${productId}/images/${imageId}`
    );
    return response.data.data;
  },

  async setPrimaryProductImage(productId: string, imageId: string): Promise<ProductDto> {
    const response = await apiClient.patch<ApiResponse<ProductDto>>(
      `/admin/products/${productId}/images/primary`,
      { imageId }
    );
    return response.data.data;
  },
};
