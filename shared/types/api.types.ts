import {
  ProductStatus,
  InventoryStatus,
  InventoryMovementType,
  ReservationStatus,
  ProductSortOption,
  ProductAvailabilityFilter,
  ShippingCalculationType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  CheckoutStep,
  ShipmentStatus,
  TrackingEventSource,
  DeliveryExceptionType,
  UserRole,
  DiscountType,
  ReviewStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
} from './enums.js';
export type { ITrackingEvent, IShipment } from './models.types.js';
import type { IAddressSnapshot, IOrderItem, ITrackingEvent } from './models.types.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: ApiFieldError[];
  timestamp: string;
  requestId?: string;
  stack?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'connecting';
    message: string;
  };
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  pendingEmail?: string;
  deletionStatus?: string;
  createdAt: string;
}

export interface AuthResponseData {
  user: SafeUser;
  accessToken: string;
}

export interface SessionDto {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
  purpose?: 'email_verification' | 'password_reset' | 'login_verification';
}

export interface ResendOtpDto {
  email: string;
  purpose?: 'email_verification' | 'password_reset' | 'login_verification';
}

// ============================================================================
// Phase 6: Customer Account & Address Management DTOs
// ============================================================================

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CreateAddressDto {
  recipientName: string;
  phone: string;
  streetAddress: string;
  apartmentSuite?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  recipientName?: string;
  phone?: string;
  streetAddress?: string;
  apartmentSuite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface AddressDto {
  id: string;
  recipientName: string;
  phone: string;
  streetAddress: string;
  apartmentSuite?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestEmailChangeDto {
  newEmail: string;
}

export interface VerifyEmailChangeDto {
  token: string;
}

export interface DeactivationRequestDto {
  password: string;
  reason?: string;
}

export interface DeletionRequestDto {
  password: string;
  reason: string;
}

export interface DeletionStatusDto {
  deletionStatus: 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';
  deletionRequestedAt?: string;
  deletionReason?: string;
}

export interface CustomerDashboardSummaryDto {
  user: SafeUser;
  addressCount: number;
  activeSessionCount: number;
  cartItemCount: number;
  orderCount: number;
  wishlistCount: number;
}

export interface AdminUserListItemDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl?: string;
  addressCount: number;
  deletionStatus: string;
  createdAt: string;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  addresses: AddressDto[];
  activeSessions: SessionDto[];
  deactivationReason?: string;
  deletionRequestedAt?: string;
  deletionReason?: string;
}

export interface AdminUpdateUserStatusDto {
  isActive: boolean;
  reason: string;
}

// ============================================================================
// Phase 7: Product & Category Management DTOs
// ============================================================================

export interface ProductImageDto {
  publicId: string;
  url: string;
  alt?: string;
  isThumbnail: boolean;
  displayOrder: number;
}

export interface ProductVariantDto {
  id?: string;
  variantId?: string;
  sku: string;
  title: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, unknown>;
  imageUrl?: string;
}

export interface ProductDto {
  id: string;
  title: string;
  name: string;
  slug: string;
  previousSlugs?: string[];
  sku: string;
  barcode?: string;
  brand?: string;
  shortDescription: string;
  fullDescription: string;
  regularPrice: number;
  salePrice?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  currency: string;
  categoryId: string;
  subCategoryId?: string;
  category?: CategoryDto;
  subCategory?: CategoryDto;
  images: ProductImageDto[];
  mainImage?: ProductImageDto;
  hasVariants: boolean;
  variants: ProductVariantDto[];
  attributes?: Record<string, unknown>;
  stockQuantity: number;
  lowStockThreshold: number;
  weightGrams?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  averageRating: number;
  reviewCount: number;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItemDto {
  id: string;
  title: string;
  name: string;
  slug: string;
  sku: string;
  brand?: string;
  shortDescription: string;
  regularPrice: number;
  salePrice?: number;
  currency: string;
  categoryId: string;
  subCategoryId?: string;
  thumbnailUrl?: string;
  images: ProductImageDto[];
  status: ProductStatus;
  featured: boolean;
  stockQuantity: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

export interface PaginatedProductsDto {
  products: ProductListItemDto[];
  pagination: PaginationMeta;
}

export interface CreateProductDto {
  title: string;
  name?: string;
  slug?: string;
  sku: string;
  barcode?: string;
  brand?: string;
  shortDescription: string;
  fullDescription: string;
  regularPrice: number;
  salePrice?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  costPrice?: number;
  currency?: string;
  imageUrl?: string;
  categoryId: string;
  subCategoryId?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: string;
  };
  status?: ProductStatus;
  featured?: boolean;
  tags?: string[];
  attributes?: Record<string, unknown>;
  hasVariants?: boolean;
  variants?: Array<{
    sku: string;
    title: string;
    price: number;
    stockQuantity: number;
    attributes: Record<string, unknown>;
    imageUrl?: string;
  }>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductStatusUpdateDto {
  status: ProductStatus;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithChildrenDto extends CategoryDto {
  children: CategoryWithChildrenDto[];
}

export interface CategoryStatusUpdateDto {
  isActive: boolean;
}

export interface AddProductImageDto {
  alt?: string;
  isThumbnail?: boolean;
  displayOrder?: number;
}

export interface ReorderProductImagesDto {
  imageIds: string[];
}

// ============================================================================
// Phase 8: Inventory & Stock Management DTOs
// ============================================================================

export interface InventoryItemDto {
  id: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  variantTitle?: string;
  sku: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: InventoryStatus;
  isInventoryTracked: boolean;
  updatedAt: string;
}

export interface InventorySummaryDto {
  totalItems: number;
  totalOnHandQuantity: number;
  totalReservedQuantity: number;
  totalAvailableQuantity: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  untrackedCount: number;
}

export interface InventoryMovementDto {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  movementType: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  operatorId?: string;
  operatorName?: string;
  timestamp: string;
}

export interface InventoryReservationItemDto {
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
}

export interface InventoryReservationDto {
  id: string;
  reservationId: string;
  userId?: string;
  sessionId?: string;
  items: InventoryReservationItemDto[];
  status: ReservationStatus;
  expiresAt: string;
  idempotencyKey?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitializeInventoryDto {
  quantity: number;
  lowStockThreshold?: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface ReceiveStockDto {
  quantity: number;
  reason: string;
  referenceId?: string;
  idempotencyKey?: string;
}

export interface DeductStockDto {
  quantity: number;
  reason: string;
  movementType?: InventoryMovementType;
  referenceId?: string;
  idempotencyKey?: string;
}

export interface AdjustStockDto {
  targetQuantity: number;
  reason: string;
  referenceId?: string;
  idempotencyKey?: string;
}

export interface UpdateThresholdDto {
  lowStockThreshold: number;
}

export interface CreateReservationDto {
  items: Array<{
    productId: string;
    variantId?: string;
    sku: string;
    quantity: number;
  }>;
  expiresInMinutes?: number;
  idempotencyKey?: string;
  referenceType?: 'cart' | 'checkout' | 'order' | 'manual';
  referenceId?: string;
}

export interface PaginatedInventoryDto {
  items: InventoryItemDto[];
  pagination: PaginationMeta;
}

export interface PaginatedMovementsDto {
  movements: InventoryMovementDto[];
  pagination: PaginationMeta;
}

// ============================================================================
// Phase 9: Product Discovery & Search Engine DTOs
// ============================================================================

export interface ProductSuggestionItemDto {
  id: string;
  title: string;
  slug: string;
  regularPrice: number;
  salePrice?: number;
  thumbnailUrl?: string;
  brand?: string;
  categoryName?: string;
}

export interface CategorySuggestionItemDto {
  id: string;
  name: string;
  slug: string;
}

export interface ProductSuggestionsDto {
  query: string;
  products: ProductSuggestionItemDto[];
  categories: CategorySuggestionItemDto[];
  brands: string[];
}

export interface SearchFacetItemDto {
  value: string;
  label: string;
  count: number;
}

export interface SearchFacetSummaryDto {
  categories: SearchFacetItemDto[];
  brands: SearchFacetItemDto[];
  priceRange: {
    min: number;
    max: number;
  };
  availability: {
    inStock: number;
    outOfStock: number;
  };
}

export interface ProductSearchResponseDto {
  products: ProductListItemDto[];
  pagination: PaginationMeta;
  query: string;
  facets: SearchFacetSummaryDto;
}

export interface ProductFilterQueryDto {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  availability?: ProductAvailabilityFilter;
  sort?: ProductSortOption;
  featured?: boolean;
  attributes?: Record<string, string>;
}

// ============================================================================
// Phase 10: Shopping Cart & Wishlist DTOs
// ============================================================================

export interface CartItemDto {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  unitPrice: number;
  unitPriceMinor: number;
  quantity: number;
  lineTotal: number;
  lineTotalMinor: number;
  thumbnailUrl?: string;
  slug?: string;
  currency: string;
  isAvailable: boolean;
  availableStock?: number;
  availabilityMessage?: string;
  priceChanged?: boolean;
  previousPrice?: number;
  currentPrice?: number;
}

export interface CartPriceChangeDto {
  itemId: string;
  productId: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  difference: number;
}

export interface CartDto {
  id: string;
  userId?: string;
  guestCartToken?: string;
  items: CartItemDto[];
  itemCount: number;
  subtotal: number;
  subtotalMinor: number;
  discountAmount: number;
  discountAmountMinor: number;
  total: number;
  totalMinor: number;
  currency: string;
  couponCode?: string;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
  priceChanges?: CartPriceChangeDto[];
  expiresAt?: string;
  updatedAt: string;
}

export interface AddCartItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateCartItemQuantityDto {
  quantity: number;
}

export interface MergeCartDto {
  guestCartToken?: string;
}

export interface CartMergeSummaryDto {
  mergedItemsCount: number;
  updatedItemsCount: number;
  unavailableItemsCount: number;
  warnings?: string[];
}

export interface CartMergeResponseDto {
  cart: CartDto;
  mergeSummary: CartMergeSummaryDto;
}

export interface WishlistItemDto {
  id: string;
  productId: string;
  title: string;
  slug: string;
  sku: string;
  regularPrice: number;
  salePrice?: number;
  currentPrice: number;
  currency: string;
  thumbnailUrl?: string;
  isAvailable: boolean;
  availableStock?: number;
  addedAt: string;
}

export interface WishlistDto {
  id: string;
  userId: string;
  items: WishlistItemDto[];
  itemCount: number;
  updatedAt: string;
}

export interface AddWishlistItemDto {
  productId: string;
}

export interface MoveWishlistItemToCartDto {
  variantId?: string;
  quantity?: number;
}

// ============================================================================
// Phase 11: Shipping, Delivery & Address Management DTOs
// ============================================================================

export interface ShippingMethodDto {
  id: string;
  zoneName: string;
  methodName: string;
  carrierName: string;
  description?: string;
  rateCalculationType: ShippingCalculationType;
  baseRate: number;
  ratePerAdditionalKg: number;
  freeShippingThreshold?: number;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  estimatedDeliveryText: string;
  countriesCovered: string[];
  statesCovered: string[];
  currency: string;
  isActive: boolean;
}

export interface ShippingDestinationInput {
  country: string;
  state: string;
  city?: string;
  postalCode?: string;
}

export interface ShippingQuoteRequestDto {
  addressId?: string;
  destination?: ShippingDestinationInput;
  shippingMethodId?: string;
  guestToken?: string;
}

export interface ShippingQuoteItemDto {
  methodId: string;
  methodName: string;
  carrierName: string;
  description?: string;
  fee: number;
  feeMinor: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  estimatedDeliveryText: string;
  isFreeShipping: boolean;
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShipping?: number;
}

export interface ShippingQuoteResponseDto {
  destination: {
    country: string;
    state: string;
    city?: string;
  };
  quotes: ShippingQuoteItemDto[];
  subtotal: number;
  subtotalMinor: number;
  currency: string;
  totalWeightKg: number;
  isDeliverable: boolean;
  message?: string;
}

export interface ShippingAvailabilityDto {
  isAvailable: boolean;
  destination: {
    country: string;
    state: string;
  };
  supportedMethodsCount: number;
  availableMethods: {
    id: string;
    methodName: string;
    carrierName: string;
    estimatedDeliveryText: string;
    baseRate: number;
    currency: string;
  }[];
  message: string;
}

export interface CreateShippingConfigDto {
  zoneName: string;
  methodName: string;
  carrierName: string;
  description?: string;
  rateCalculationType?: ShippingCalculationType;
  baseRate: number;
  ratePerAdditionalKg?: number;
  freeShippingThreshold?: number;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  countriesCovered?: string[];
  statesCovered: string[];
  currency?: string;
  isActive?: boolean;
}

export interface UpdateShippingConfigDto {
  zoneName?: string;
  methodName?: string;
  carrierName?: string;
  description?: string;
  rateCalculationType?: ShippingCalculationType;
  baseRate?: number;
  ratePerAdditionalKg?: number;
  freeShippingThreshold?: number;
  estimatedDeliveryDaysMin?: number;
  estimatedDeliveryDaysMax?: number;
  countriesCovered?: string[];
  statesCovered?: string[];
  currency?: string;
  isActive?: boolean;
}

export interface ShippingConfigFilterDto {
  isActive?: boolean;
  country?: string;
  state?: string;
  search?: string;
}

// ============================================================================
// Phase 12: Checkout & Order Processing DTOs
// ============================================================================

export interface CheckoutSessionDto {
  sessionId: string;
  step: CheckoutStep;
  cart: CartDto;
  shippingAddressId?: string;
  shippingAddressSnapshot?: IAddressSnapshot;
  shippingMethodId?: string;
  shippingMethodSnapshot?: {
    methodId: string;
    methodName: string;
    carrierName?: string;
    fee: number;
    feeMinor: number;
    currency: string;
    estimatedDeliveryText: string;
    isFreeShipping: boolean;
  };
  subtotal: number;
  subtotalMinor: number;
  shippingFee: number;
  shippingFeeMinor: number;
  discountAmount: number;
  discountAmountMinor: number;
  taxAmount: number;
  taxAmountMinor: number;
  totalAmount: number;
  totalAmountMinor: number;
  currency: string;
  expiresAt: string;
  orderId?: string;
  orderNumber?: string;
}

export interface CheckoutSetAddressDto {
  addressId: string;
}

export interface CheckoutSetShippingDto {
  shippingMethodId: string;
}

export interface CheckoutSummaryDto {
  sessionId: string;
  step: CheckoutStep;
  items: Array<{
    productId: string;
    variantId?: string;
    sku: string;
    title: string;
    unitPrice: number;
    unitPriceMinor: number;
    quantity: number;
    subtotal: number;
    subtotalMinor: number;
    thumbnailUrl?: string;
  }>;
  subtotal: number;
  subtotalMinor: number;
  shippingFee: number;
  shippingFeeMinor: number;
  discountAmount: number;
  discountAmountMinor: number;
  taxAmount: number;
  taxAmountMinor: number;
  totalAmount: number;
  totalAmountMinor: number;
  currency: string;
  shippingAddress?: IAddressSnapshot;
  shippingMethod?: {
    methodId: string;
    methodName: string;
    carrierName?: string;
    fee: number;
    feeMinor: number;
    currency: string;
    estimatedDeliveryText: string;
    isFreeShipping: boolean;
  };
  isReadyForOrder: boolean;
  isReadyForConfirmation?: boolean;
  validationIssues?: string[];
}

export interface CheckoutValidateResponseDto {
  isValid: boolean;
  issues: string[];
  summary: CheckoutSummaryDto;
}

export interface CheckoutConfirmRequestDto {
  acceptTerms: boolean;
  customerNotes?: string;
  idempotencyKey?: string;
}

export interface CheckoutConfirmResponseDto {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  totalAmountMinor: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  reservationReference: string;
  message: string;
  nextSteps: string;
  order: OrderDetailDto;
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItem[];
  shippingAddress: IAddressSnapshot;
  billingAddress?: IAddressSnapshot;
  subtotal: number;
  subtotalMinor: number;
  discountAmount: number;
  discountAmountMinor: number;
  couponCode?: string;
  shippingFee: number;
  shippingFeeMinor: number;
  taxAmount: number;
  taxAmountMinor: number;
  totalAmount: number;
  totalAmountMinor: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  shippingMethodId?: string;
  shippingMethodName?: string;
  estimatedDeliveryText?: string;
  reservationReference?: string;
  checkoutSessionId?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItemDto {
  id: string;
  orderNumber: string;
  itemCount: number;
  firstItemTitle: string;
  firstItemThumbnailUrl?: string;
  totalAmount: number;
  totalAmountMinor: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface CancelOrderDto {
  reason?: string;
}

export interface UpdateOrderStatusDto {
  orderStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

export interface OrderAdminFilterDto {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OrderAuditEntryDto {
  _id?: string;
  id?: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  createdAt: string;
  userId?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

// ============================================================================
// Phase 13: Payment Gateway & Financial Processing DTOs
// ============================================================================

export interface InitializePaymentDto {
  orderNumber: string;
  callbackUrl?: string;
}

export interface PaymentInitializationResultDto {
  paymentReference: string;
  authorizationUrl: string;
  accessCode?: string;
  orderNumber: string;
  amount: number;
  amountMinor: number;
  currency: string;
  gateway: string;
}

export interface VerifyPaymentResultDto {
  paymentReference: string;
  orderNumber: string;
  status: PaymentStatus;
  amount: number;
  amountMinor: number;
  currency: string;
  gateway: string;
  gatewayTransactionId?: string;
  channel?: string;
  paidAt?: string;
  verifiedAt?: string;
  isOrderConfirmed: boolean;
  orderStatus: OrderStatus;
}

export interface PaymentDetailsDto {
  id: string;
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  amount: number;
  amountMinor: number;
  currency: string;
  gateway: string;
  gatewayTransactionId?: string;
  authorizationUrl?: string;
  channel?: string;
  status: PaymentStatus;
  paidAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  refunds?: RefundDto[];
}

export interface PaymentListItemDto {
  id: string;
  paymentReference: string;
  orderNumber: string;
  customerEmail: string;
  amount: number;
  amountMinor: number;
  currency: string;
  gateway: string;
  channel?: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface CreateRefundDto {
  amount?: number;
  reason: string;
  customerNote?: string;
  merchantNote?: string;
}

export interface RefundDto {
  id: string;
  refundReference: string;
  paymentReference: string;
  orderNumber: string;
  amount: number;
  amountMinor: number;
  currency: string;
  reason: string;
  customerNote?: string;
  status: RefundStatus;
  gateway: string;
  createdAt: string;
}

export interface PaymentFilterDto {
  status?: PaymentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RefundFilterDto {
  status?: RefundStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReconciliationResultDto {
  paymentReference: string;
  orderNumber: string;
  internalAmountMinor: number;
  providerAmountMinor: number;
  currency: string;
  internalStatus: string;
  providerStatus: string;
  matched: boolean;
  discrepancies: string[];
  reconciledAt: string;
}

// ==========================================
// Phase 14: Order Fulfilment & Tracking DTOs
// ==========================================

export interface CreateShipmentDto {
  carrierName: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  deliveryNotes?: string;
  dispatchNow?: boolean;
}

export interface UpdateShipmentDto {
  carrierName?: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  deliveryNotes?: string;
}

export interface AddTrackingEventDto {
  status: ShipmentStatus;
  title: string;
  description: string;
  location?: string;
  timestamp?: string;
  source?: TrackingEventSource;
}

export interface DeliveryConfirmationDto {
  actualDeliveryDate?: string;
  deliveredTo: string;
  deliveryNotes?: string;
  proofOfDeliveryUrl?: string;
}

export interface DeliveryExceptionDto {
  exceptionType: DeliveryExceptionType;
  description: string;
  location?: string;
  rescheduledDeliveryDate?: string;
  deliveryNotes?: string;
}

export interface UpdateFulfilmentStatusDto {
  status: OrderStatus;
  notes?: string;
  location?: string;
}

export interface FulfilmentFilterDto {
  status?: OrderStatus | ShipmentStatus;
  search?: string;
  carrier?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ShipmentDetailDto {
  id: string;
  shipmentReference: string;
  orderId: string;
  orderNumber: string;
  carrierName: string;
  carrierService?: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippingMethod: string;
  status: ShipmentStatus;
  destinationAddress: IAddressSnapshot;
  dispatchedAt?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveredTo?: string;
  deliveryNotes?: string;
  proofOfDeliveryUrl?: string;
  responsibleStaffName?: string;
  events: ITrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderFulfilmentDetailDto {
  order: OrderDetailDto;
  shipment?: ShipmentDetailDto;
  timeline: ITrackingEvent[];
}

export interface CustomerTrackingDto {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: ShipmentStatus;
  carrierName?: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingMethod: string;
  destinationAddress: IAddressSnapshot;
  dispatchedAt?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveredTo?: string;
  items: IOrderItem[];
  events: ITrackingEvent[];
}

// ============================================================================
// Phase 15: Admin Dashboard & Centralized Management System DTOs
// ============================================================================

export interface DashboardSummaryDto {
  revenue: {
    totalRevenueMinor: number;
    totalRevenue: number;
    currency: string;
    verifiedCount: number;
  };
  orders: {
    totalOrders: number;
    pendingPayment: number;
    paid: number;
    processing: number;
    packed: number;
    readyForShipment: number;
    shipped: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    failed: number;
  };
  customers: {
    totalCustomers: number;
    activeCustomers: number;
  };
  products: {
    totalProducts: number;
    publishedProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  refunds: {
    pendingRefundsCount: number;
    totalRefundedMinor: number;
    totalRefunded: number;
  };
  support: {
    openTicketsCount: number;
  };
}

export interface DashboardChartsDto {
  salesOverTime: Array<{ date: string; revenue: number; orderCount: number }>;
  orderStatusDistribution: Array<{ status: string; count: number }>;
  paymentStatusDistribution: Array<{ status: string; count: number }>;
  topProducts: Array<{ productId: string; title: string; sku: string; unitsSold: number; totalRevenue: number }>;
  categoryPerformance: Array<{ categoryId: string; name: string; revenue: number; orderCount: number }>;
}

export interface DashboardFilterDto {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';
}

// Coupons & Promotions
export interface CouponDto {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  expiryDate: string;
  usageLimitTotal?: number;
  usageLimitPerUser: number;
  usedCount: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponDto {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  startDate: string;
  expiryDate: string;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive?: boolean;
}

export interface UpdateCouponDto {
  code?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  expiryDate?: string;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive?: boolean;
}

export interface ValidateCouponDto {
  code: string;
  subtotal: number;
}

export interface CouponValidationResultDto {
  valid: boolean;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  newSubtotal: number;
  message: string;
}

export interface PaginatedCouponsDto {
  coupons: CouponDto[];
  pagination: PaginationMeta;
}

// Reviews & Moderation
export interface ReviewDto {
  id: string;
  productId: string;
  productTitle?: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  orderId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  isVerifiedBuyer: boolean;
  status: ReviewStatus;
  helpfulVotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  orderId?: string;
}

export interface UpdateReviewStatusDto {
  status: ReviewStatus;
  moderationReason?: string;
}

export interface ReviewFilterDto {
  productId?: string;
  status?: ReviewStatus;
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedReviewsDto {
  reviews: ReviewDto[];
  pagination: PaginationMeta;
}

// Support Tickets
export interface SupportMessageDto {
  messageId?: string;
  senderId: string;
  senderName?: string;
  senderRole: UserRole;
  content: string;
  attachments?: string[];
  sentAt: string;
}

export interface SupportTicketDto {
  id: string;
  ticketNumber: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  orderId?: string;
  orderNumber?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  messages: SupportMessageDto[];
  assignedTo?: string;
  assignedStaffName?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportTicketDto {
  subject: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  orderId?: string;
  message: string;
}

export interface AddTicketMessageDto {
  content: string;
  attachments?: string[];
}

export interface UpdateTicketStatusDto {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assignedTo?: string;
}

export interface TicketFilterDto {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  search?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTicketsDto {
  tickets: SupportTicketDto[];
  pagination: PaginationMeta;
}

// Sales & Financial Reports
export interface SalesReportDto {
  period: string;
  currency: string;
  grossSalesMinor: number;
  grossSales: number;
  refundsMinor: number;
  refunds: number;
  netSalesMinor: number;
  netSales: number;
  ordersCount: number;
  averageOrderValue: number;
  itemsSold: number;
  dailyBreakdown: Array<{
    date: string;
    orders: number;
    grossRevenue: number;
    netRevenue: number;
    refunds: number;
  }>;
}

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';
}

// Audit Logs
export interface AuditLogItemDto {
  id: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  changesDiff?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface AuditFilterDto {
  actorId?: string;
  entity?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogsDto {
  logs: AuditLogItemDto[];
  pagination: PaginationMeta;
}

// Platform Settings
export interface PlatformSettingsDto {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  storeAddress: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  freeShippingThresholdMinor: number;
  lowStockAlertThreshold: number;
  orderAutoCancellationMinutes: number;
  supportEmail: string;
  policies: {
    privacyPolicy?: string;
    returnPolicy?: string;
    termsOfService?: string;
  };
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdatePlatformSettingsDto {
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  storeAddress?: string;
  freeShippingThresholdMinor?: number;
  lowStockAlertThreshold?: number;
  orderAutoCancellationMinutes?: number;
  supportEmail?: string;
  policies?: {
    privacyPolicy?: string;
    returnPolicy?: string;
    termsOfService?: string;
  };
}

// Administrative Team & Permission Management
export interface AdminStaffItemDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateStaffDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole.STAFF | UserRole.ADMIN;
  password: string;
}

export interface UpdateStaffRoleDto {
  role?: UserRole.STAFF | UserRole.ADMIN;
  isActive?: boolean;
}

// ============================================================================
// Phase 17: Notifications, Emails & Customer Communication DTOs
// ============================================================================

export interface NotificationDto {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UnreadNotificationCountDto {
  unreadCount: number;
}

export interface NotificationQueryDto {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface NotificationPreferenceDto {
  userId: string;
  orderUpdates: boolean;
  securityAlerts: boolean;
  promotionalEmails: boolean;
  newsletter: boolean;
  inAppAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceDto {
  promotionalEmails?: boolean;
  newsletter?: boolean;
  inAppAlerts?: boolean;
  smsAlerts?: boolean;
  pushAlerts?: boolean;
}

export interface AdminNotificationOutboxDto {
  id: string;
  eventId: string;
  eventType: NotificationType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  content: {
    subject?: string;
    body: string;
    actionUrl?: string;
    templateId?: string;
  };
  status: NotificationDeliveryStatus;
  priority: NotificationPriority;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  errorMessage?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationQueryDto {
  status?: NotificationDeliveryStatus;
  channel?: NotificationChannel;
  eventType?: NotificationType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminNotificationRetryResponseDto {
  outboxId: string;
  status: NotificationDeliveryStatus;
  message: string;
}

export interface NotificationTemplateDto {
  id: string;
  name: string;
  eventType: NotificationType;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: string[];
  description: string;
}



