import { Router, type Request, type Response } from 'express';
import { env } from '../config/env.js';

export const docsRouter = Router();

/**
 * OpenAPI 3.0.3 Specification Document
 */
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cartiva Mini REST API',
    version: '1.0.0',
    description:
      'Production-grade e-commerce backend API for Cartiva Mini. Built with Node.js, Express, TypeScript, and MongoDB.',
    contact: {
      name: 'Cartiva Mini Engineering',
      email: 'engineering@cartivamini.com',
    },
  },
  servers: [
    {
      url: `${env.BACKEND_URL}/api/v1`,
      description: `${env.NODE_ENV} environment`,
    },
  ],
  tags: [
    {
      name: 'Authentication & Authorization',
      description:
        'Customer registration, secure login, dual-token JWT management, email verification, password recovery, and session revocation.',
    },
    {
      name: 'System Infrastructure',
      description: 'Liveness probes, readiness checks, and service health diagnostics.',
    },
    {
      name: 'Future Domain Modules (Roadmap)',
      description:
        'Planned endpoints for Products (Phase 7), Inventory (Phase 8), Orders (Phase 12), and Payments (Phase 13).',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Register Customer Account',
        description:
          'Creates a new customer account with bcrypt password hashing and dispatches a verification email.',
        responses: {
          '201': { description: 'Registration successful; verification email sent.' },
          '409': { description: 'Email already exists.' },
          '422': { description: 'Validation failed.' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Authenticate Customer',
        description:
          'Authenticates with email and password, returns access token, and sets httpOnly refresh token cookie.',
        responses: {
          '200': { description: 'Login successful.' },
          '401': { description: 'Invalid credentials or account locked.' },
          '403': { description: 'Email not verified or account inactive.' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Refresh Session & Rotate Token',
        description:
          'Rotates refresh token and issues a new access token. Protects against token reuse/replay.',
        responses: {
          '200': { description: 'Token refreshed.' },
          '401': { description: 'Invalid or revoked refresh token.' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Logout Current Session',
        description: 'Revokes the current server session and clears refresh token cookie.',
        responses: {
          '200': { description: 'Logged out successfully.' },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Logout From All Sessions',
        security: [{ BearerAuth: [] }],
        description: 'Revokes all active sessions on all devices for the authenticated user.',
        responses: {
          '200': { description: 'All sessions revoked.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication & Authorization'],
        summary: 'Get Authenticated Profile',
        security: [{ BearerAuth: [] }],
        description: 'Returns profile details for the currently authenticated user.',
        responses: {
          '200': { description: 'Profile retrieved.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Verify Email Address',
        description: 'Verifies email address using the secure 6-digit OTP code dispatched upon registration.',
        responses: {
          '200': { description: 'Email verified successfully.' },
          '400': { description: 'Invalid or expired OTP code.' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Resend Verification Code',
        description: 'Dispatches a new 6-digit OTP verification code for an unverified account.',
        responses: {
          '200': { description: 'Verification code dispatched.' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Request Password Reset',
        description: 'Generates a secure password reset link and dispatches instructions.',
        responses: {
          '200': { description: 'Instructions dispatched if account exists.' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Reset Password With Token',
        description: 'Sets a new password and revokes all active sessions.',
        responses: {
          '200': { description: 'Password reset successful.' },
          '400': { description: 'Invalid or expired token.' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication & Authorization'],
        summary: 'Change Password (Authenticated)',
        security: [{ BearerAuth: [] }],
        description:
          'Updates password using current password verification and revokes other sessions.',
        responses: {
          '200': { description: 'Password updated.' },
          '400': { description: 'Incorrect current password or matching passwords.' },
        },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Authentication & Authorization'],
        summary: 'List Active Sessions',
        security: [{ BearerAuth: [] }],
        description: 'Lists all active devices and sessions for the authenticated customer.',
        responses: {
          '200': { description: 'Active sessions list.' },
        },
      },
    },
    '/auth/sessions/{id}': {
      delete: {
        tags: ['Authentication & Authorization'],
        summary: 'Revoke Selected Session',
        security: [{ BearerAuth: [] }],
        description: 'Revokes a specific session by session ID.',
        responses: {
          '200': { description: 'Session revoked.' },
          '404': { description: 'Session not found.' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Customer Account & Profile'],
        summary: 'Get Authenticated Customer Profile',
        security: [{ BearerAuth: [] }],
        description:
          'Returns customer profile details, verification status, and saved address count.',
        responses: {
          '200': { description: 'Profile retrieved successfully.' },
          '401': { description: 'Unauthorized.' },
        },
      },
      patch: {
        tags: ['Customer Account & Profile'],
        summary: 'Update Customer Profile',
        security: [{ BearerAuth: [] }],
        description:
          'Updates personal information (firstName, lastName, phone). Administrative fields are protected from modification.',
        responses: {
          '200': { description: 'Profile updated successfully.' },
          '422': { description: 'Validation failed.' },
        },
      },
    },
    '/users/me/avatar': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Upload Profile Avatar',
        security: [{ BearerAuth: [] }],
        description:
          'Uploads an avatar image (JPEG, PNG, WebP up to 2MB). Validates binary magic bytes and stores securely.',
        responses: {
          '200': { description: 'Avatar uploaded successfully.' },
          '400': { description: 'Invalid file or file too large.' },
        },
      },
      delete: {
        tags: ['Customer Account & Profile'],
        summary: 'Remove Profile Avatar',
        security: [{ BearerAuth: [] }],
        description: 'Removes the current avatar and purges stored asset.',
        responses: {
          '200': { description: 'Avatar removed.' },
        },
      },
    },
    '/users/me/dashboard': {
      get: {
        tags: ['Customer Account & Profile'],
        summary: 'Customer Dashboard Summary',
        security: [{ BearerAuth: [] }],
        description:
          'Provides overview metrics (profile, address count, active sessions, cart/order placeholder counts).',
        responses: {
          '200': { description: 'Dashboard overview retrieved.' },
        },
      },
    },
    '/users/me/addresses': {
      get: {
        tags: ['Delivery Addresses'],
        summary: 'List Saved Delivery Addresses',
        security: [{ BearerAuth: [] }],
        description: 'Returns all saved delivery addresses for the authenticated customer.',
        responses: {
          '200': { description: 'Addresses retrieved.' },
        },
      },
      post: {
        tags: ['Delivery Addresses'],
        summary: 'Save New Delivery Address',
        security: [{ BearerAuth: [] }],
        description:
          'Adds a delivery address. Enforces max 10 addresses limit. Automatically sets default if first address.',
        responses: {
          '201': { description: 'Address created.' },
          '400': { description: 'Address limit reached.' },
          '422': { description: 'Validation failed.' },
        },
      },
    },
    '/users/me/addresses/{addressId}': {
      patch: {
        tags: ['Delivery Addresses'],
        summary: 'Update Delivery Address',
        security: [{ BearerAuth: [] }],
        description:
          'Updates an existing delivery address. Enforces strict customer ownership checks (IDOR protection).',
        responses: {
          '200': { description: 'Address updated.' },
          '404': { description: 'Address not found or unauthorized.' },
        },
      },
      delete: {
        tags: ['Delivery Addresses'],
        summary: 'Delete Delivery Address',
        security: [{ BearerAuth: [] }],
        description:
          'Deletes address. If deleted address was default, auto-promotes the next address.',
        responses: {
          '200': { description: 'Address deleted.' },
          '404': { description: 'Address not found.' },
        },
      },
    },
    '/users/me/addresses/{addressId}/default': {
      patch: {
        tags: ['Delivery Addresses'],
        summary: 'Set Address as Default',
        security: [{ BearerAuth: [] }],
        description:
          'Sets selected address as primary delivery address and unsets previous defaults atomically.',
        responses: {
          '200': { description: 'Default address set.' },
          '404': { description: 'Address not found.' },
        },
      },
    },
    '/users/me/email-change': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Request Email Address Change',
        security: [{ BearerAuth: [] }],
        description:
          'Generates a 24-hour verification token and sends confirmation email to the requested new address.',
        responses: {
          '200': { description: 'Verification email sent.' },
          '409': { description: 'Email already registered.' },
        },
      },
    },
    '/users/me/email-change/verify': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Confirm Email Address Change',
        description:
          'Verifies the cryptographic token, updates primary email address, and revokes previous sessions.',
        responses: {
          '200': { description: 'Email address updated.' },
          '400': { description: 'Invalid or expired token.' },
        },
      },
    },
    '/users/me/email-change/resend': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Resend Email Change Verification',
        security: [{ BearerAuth: [] }],
        description: 'Resends verification link to pending new email address.',
        responses: {
          '200': { description: 'Verification email resent.' },
        },
      },
    },
    '/users/me/deactivation-request': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Deactivate Account',
        security: [{ BearerAuth: [] }],
        description:
          'Verifies current password, terminates all active sessions, and marks account inactive.',
        responses: {
          '200': { description: 'Account deactivated.' },
          '401': { description: 'Incorrect password.' },
        },
      },
    },
    '/users/me/deletion-request': {
      post: {
        tags: ['Customer Account & Profile'],
        summary: 'Request Account Deletion (GDPR/Privacy)',
        security: [{ BearerAuth: [] }],
        description:
          'Registers formal deletion request for compliance review while preserving statutory transaction records.',
        responses: {
          '200': { description: 'Deletion request registered.' },
          '409': { description: 'Deletion request already pending.' },
        },
      },
      get: {
        tags: ['Customer Account & Profile'],
        summary: 'Check Deletion Request Status',
        security: [{ BearerAuth: [] }],
        description: 'Returns status and submission timestamp of pending deletion request.',
        responses: {
          '200': { description: 'Deletion status retrieved.' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Administrative Customer Management'],
        summary: 'List / Search Customer Accounts',
        security: [{ BearerAuth: [] }],
        description:
          'Allows administrators to search, filter, and paginate through customer accounts.',
        responses: {
          '200': { description: 'Customer list retrieved.' },
          '403': { description: 'Forbidden (Admin role required).' },
        },
      },
    },
    '/admin/users/{userId}': {
      get: {
        tags: ['Administrative Customer Management'],
        summary: 'View Customer Detail & Audit Overview',
        security: [{ BearerAuth: [] }],
        description:
          'Retrieves comprehensive customer account details, saved addresses, and active session count.',
        responses: {
          '200': { description: 'Customer detail retrieved.' },
          '403': { description: 'Forbidden.' },
          '404': { description: 'User not found.' },
        },
      },
    },
    '/admin/users/{userId}/status': {
      patch: {
        tags: ['Administrative Customer Management'],
        summary: 'Suspend or Restore Customer Account',
        security: [{ BearerAuth: [] }],
        description:
          'Modifies customer active status, terminates sessions if suspended, and records administrative audit log.',
        responses: {
          '200': { description: 'Status updated.' },
          '403': { description: 'Forbidden.' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System Infrastructure'],
        summary: 'Service Liveness Probe',
        description:
          'Confirms that the Express application is running, reports system uptime, memory metrics, and current database connectivity status.',
        responses: {
          '200': {
            description: 'Application is healthy and accepting requests.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponseEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['System Infrastructure'],
        summary: 'Service Readiness Probe',
        description:
          'Evaluates if all critical external dependencies (MongoDB) are operational. Returns 503 while database connection is deferred to Phase 4.',
        responses: {
          '200': {
            description: 'All dependencies are connected and ready for traffic.',
          },
          '503': {
            description: 'Service is starting or dependencies are disconnected.',
          },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Product & Catalog'],
        summary: 'Public Published Product Catalog',
        description:
          'Retrieves published products with pagination and category/brand/price filtering.',
        responses: { '200': { description: 'Products retrieved successfully.' } },
      },
    },
    '/products/featured': {
      get: {
        tags: ['Product & Catalog'],
        summary: 'Featured Products',
        description: 'Retrieves published featured products for homepage and marketing showcases.',
        responses: { '200': { description: 'Featured products retrieved successfully.' } },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Product & Catalog'],
        summary: 'Product Details by Slug',
        description: 'Retrieves published product details and image gallery by unique slug.',
        responses: {
          '200': { description: 'Product details retrieved successfully.' },
          '404': { description: 'Product not found.' },
        },
      },
    },
    '/products/{slug}/related': {
      get: {
        tags: ['Product & Catalog'],
        summary: 'Related Products',
        description: 'Retrieves products in the same category excluding the current product.',
        responses: { '200': { description: 'Related products retrieved successfully.' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Category Taxonomy'],
        summary: 'Public Active Categories',
        description: 'Retrieves active category hierarchy with nested subcategories.',
        responses: { '200': { description: 'Categories retrieved successfully.' } },
      },
    },
    '/categories/{slug}': {
      get: {
        tags: ['Category Taxonomy'],
        summary: 'Category Details by Slug',
        description: 'Retrieves active category details and product counts by slug.',
        responses: {
          '200': { description: 'Category details retrieved successfully.' },
          '404': { description: 'Category not found.' },
        },
      },
    },
    '/admin/products': {
      post: {
        tags: ['Product Administration'],
        summary: 'Create Product',
        description:
          'Allows administrators to create a product with unique SKU, slug, pricing, and variants.',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Product created successfully.' },
          '400': { description: 'Validation error.' },
          '409': { description: 'Duplicate SKU or slug.' },
        },
      },
      get: {
        tags: ['Product Administration'],
        summary: 'List All Products (Admin)',
        description:
          'Paginated product listing supporting filtering by draft/published/archived status.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Admin products retrieved successfully.' } },
      },
    },
    '/admin/products/{productId}': {
      get: {
        tags: ['Product Administration'],
        summary: 'Product Detail (Admin)',
        description: 'View full product details including costPrice and internal attributes.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Product details retrieved.' } },
      },
      patch: {
        tags: ['Product Administration'],
        summary: 'Update Product',
        description: 'Update product title, pricing, variants, and metadata.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Product updated.' } },
      },
      delete: {
        tags: ['Product Administration'],
        summary: 'Archive Product',
        description: 'Soft-deletes/archives product while preserving historical relationships.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Product archived.' } },
      },
    },
    '/admin/products/{productId}/status': {
      patch: {
        tags: ['Product Administration'],
        summary: 'Update Product Status',
        description: 'Transition product between DRAFT, PUBLISHED, ARCHIVED, or UNPUBLISHED.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Product status updated.' } },
      },
    },
    '/admin/products/{productId}/images': {
      post: {
        tags: ['Product Administration'],
        summary: 'Upload Product Image',
        description:
          'Upload product image (max 5MB, JPEG/PNG/WebP with binary magic-byte inspection).',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Image uploaded.' } },
      },
    },
    '/admin/products/{productId}/images/{imageId}': {
      delete: {
        tags: ['Product Administration'],
        summary: 'Delete Product Image',
        description: 'Remove product image and delete from disk or cloud CDN.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Image removed.' } },
      },
    },
    '/admin/products/{productId}/images/primary': {
      patch: {
        tags: ['Product Administration'],
        summary: 'Set Primary Product Image',
        description: 'Mark specific image as primary thumbnail across storefront views.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Primary image set.' } },
      },
    },
    '/admin/categories': {
      post: {
        tags: ['Category Administration'],
        summary: 'Create Category',
        description: 'Create category or subcategory with unique slug and display order.',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Category created.' } },
      },
      get: {
        tags: ['Category Administration'],
        summary: 'List All Categories (Admin)',
        description: 'List all categories with product counts and parent hierarchies.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Categories retrieved.' } },
      },
    },
    '/admin/categories/{categoryId}': {
      get: {
        tags: ['Category Administration'],
        summary: 'Category Detail (Admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Category details retrieved.' } },
      },
      patch: {
        tags: ['Category Administration'],
        summary: 'Update Category',
        description: 'Update category details with circular hierarchy cycle prevention.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Category updated.' } },
      },
      delete: {
        tags: ['Category Administration'],
        summary: 'Delete Category',
        description: 'Delete empty category. Blocks deletion if active products are assigned.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Category deleted.' },
          '400': { description: 'Category has assigned products or subcategories.' },
        },
      },
    },
    '/admin/categories/{categoryId}/status': {
      patch: {
        tags: ['Category Administration'],
        summary: 'Update Category Status',
        description: 'Toggle active/inactive status of category.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Category status updated.' } },
      },
    },
    // ========================================================================
    // Phase 8: Inventory & Stock Management OpenAPI Endpoints
    // ========================================================================
    '/admin/inventory': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'List Inventory Items',
        description:
          'Paginated inventory items across standalone products and variants with real-time stock status calculation.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Inventory items retrieved successfully.' } },
      },
    },
    '/admin/inventory/summary': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'Inventory Summary Metrics',
        description:
          'Aggregated stock metrics including total on-hand, reserved, available, and status breakdown counts.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Inventory summary retrieved successfully.' } },
      },
    },
    '/admin/inventory/low-stock': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'List Low-Stock Items',
        description:
          'Filtered list of inventory items currently at or below their configured low-stock threshold.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Low-stock items retrieved successfully.' } },
      },
    },
    '/admin/inventory/out-of-stock': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'List Out-of-Stock Items',
        description: 'Filtered list of inventory items with zero available units.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Out-of-stock items retrieved successfully.' } },
      },
    },
    '/admin/inventory/movements': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'System-wide Inventory Movement Ledger',
        description: 'Audit log of historical stock movements across all catalog items.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Movement ledger retrieved successfully.' } },
      },
    },
    '/admin/inventory/{inventoryId}': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'Get Inventory Item Detail',
        description:
          'Retrieve real-time inventory and availability details for a product or variation.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Inventory detail retrieved.' },
          '404': { description: 'Inventory item not found.' },
        },
      },
    },
    '/admin/inventory/{inventoryId}/movements': {
      get: {
        tags: ['Inventory Administration'],
        summary: 'Target Inventory Movements',
        description: 'Paginated movement history for a specific product or variant.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Movements retrieved.' } },
      },
    },
    '/admin/inventory/{inventoryId}/initialize': {
      post: {
        tags: ['Inventory Administration'],
        summary: 'Initialize Stock',
        description:
          'Sets initial stock count and threshold for a product or variant. Duplicate initialization is strictly rejected.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Stock initialized successfully.' },
          '400': { description: 'Stock already initialized.' },
        },
      },
    },
    '/admin/inventory/{inventoryId}/receive': {
      post: {
        tags: ['Inventory Administration'],
        summary: 'Receive Stock (Atomic Restock)',
        description:
          'Increases on-hand stock atomically and records an immutable restock movement.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Stock received successfully.' } },
      },
    },
    '/admin/inventory/{inventoryId}/adjust': {
      post: {
        tags: ['Inventory Administration'],
        summary: 'Manual Stock Adjustment',
        description: 'Reconciles physical count to a target quantity with audit justification.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Stock adjusted successfully.' } },
      },
    },
    '/admin/inventory/{inventoryId}/deduct': {
      post: {
        tags: ['Inventory Administration'],
        summary: 'Deduct Stock',
        description:
          'Decreases stock for damaged, lost, or corrected units. Overselling and negative stock are strictly prevented.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Stock deducted successfully.' },
          '400': { description: 'Insufficient stock or negative balance disallowed.' },
        },
      },
    },
    '/admin/inventory/{inventoryId}/threshold': {
      patch: {
        tags: ['Inventory Administration'],
        summary: 'Update Low-Stock Threshold',
        description: 'Configures the low-stock notification threshold for a product or variant.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Threshold updated successfully.' } },
      },
    },
    '/inventory/reservations': {
      post: {
        tags: ['Inventory Reservations'],
        summary: 'Create Stock Reservation',
        description:
          'Atomically reserves stock for cart/checkout items with idempotency key protection and TTL auto-expiry.',
        responses: {
          '201': { description: 'Reservation created successfully.' },
          '400': { description: 'Insufficient stock or invalid items.' },
        },
      },
    },
    '/inventory/reservations/{reservationId}': {
      get: {
        tags: ['Inventory Reservations'],
        summary: 'Get Reservation Details',
        description:
          'Retrieves reservation status and automatically checks/handles TTL expiration.',
        responses: {
          '200': { description: 'Reservation details retrieved.' },
          '404': { description: 'Reservation not found.' },
        },
      },
    },
    '/inventory/reservations/{reservationId}/release': {
      post: {
        tags: ['Inventory Reservations'],
        summary: 'Release Stock Reservation',
        description: 'Releases held reserved stock back into available quantity.',
        responses: {
          '200': { description: 'Reservation released successfully.' },
          '400': { description: 'Reservation already confirmed or released.' },
        },
      },
    },
    '/products/search': {
      get: {
        tags: ['Product Discovery & Search'],
        summary: 'Search Products with Facets',
        description:
          'Full-text product search with category, brand, price-range, and stock availability facets.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          {
            name: 'availability',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'in_stock', 'out_of_stock'] },
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'relevance',
                'newest',
                'price_asc',
                'price_desc',
                'name_asc',
                'name_desc',
                'rating',
                'popular',
              ],
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Search results and facet distributions.' },
        },
      },
    },
    '/products/suggestions': {
      get: {
        tags: ['Product Discovery & Search'],
        summary: 'Search Autocomplete & Suggestions',
        description:
          'Returns real-time suggestions for products, categories, and brands matching query.',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } },
        ],
        responses: {
          '200': { description: 'Search suggestions.' },
        },
      },
    },
    '/products/new-arrivals': {
      get: {
        tags: ['Product Discovery & Search'],
        summary: 'New Product Arrivals',
        description: 'Returns newest published products in the store catalog.',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 8 } }],
        responses: {
          '200': { description: 'New arrivals list.' },
        },
      },
    },
    '/categories/{slug}/products': {
      get: {
        tags: ['Product Discovery & Search'],
        summary: 'Category Products Discovery',
        description:
          'Returns paginated products belonging to a category and all its active descendant subcategories.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'availability', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Category products.' },
          '404': { description: 'Category not found or inactive.' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Shopping Cart'],
        summary: 'Retrieve current shopping cart',
        description:
          'Retrieves current cart for authenticated user or guest session with live stock and price revalidation.',
        responses: {
          '200': { description: 'Cart retrieved successfully.' },
        },
      },
      delete: {
        tags: ['Shopping Cart'],
        summary: 'Clear shopping cart',
        description: 'Removes all items from the current shopping cart.',
        responses: {
          '200': { description: 'Cart cleared successfully.' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Shopping Cart'],
        summary: 'Add item to shopping cart',
        description:
          'Adds an item or variant to the cart with server-side price validation and atomic stock verification.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', default: 1 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Item added to cart successfully.' },
          '400': { description: 'Insufficient stock or invalid quantity.' },
          '404': { description: 'Product not found.' },
        },
      },
    },
    '/cart/items/{itemId}': {
      patch: {
        tags: ['Shopping Cart'],
        summary: 'Update cart item quantity',
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: {
                  quantity: { type: 'integer', minimum: 1, maximum: 99 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Quantity updated successfully.' },
          '400': { description: 'Insufficient stock or invalid quantity.' },
          '404': { description: 'Cart item not found.' },
        },
      },
      delete: {
        tags: ['Shopping Cart'],
        summary: 'Remove item from shopping cart',
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Item removed from cart.' },
          '404': { description: 'Cart item not found.' },
        },
      },
    },
    '/cart/merge': {
      post: {
        tags: ['Shopping Cart'],
        summary: 'Merge guest cart into customer cart',
        description:
          'Merges an anonymous guest session cart into authenticated customer cart upon login.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  guestCartToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Cart merged successfully.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/wishlist': {
      get: {
        tags: ['Wishlist'],
        summary: 'Retrieve customer wishlist',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Wishlist retrieved successfully.' },
          '401': { description: 'Authentication required.' },
        },
      },
    },
    '/wishlist/items': {
      post: {
        tags: ['Wishlist'],
        summary: 'Add product to wishlist',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Product added to wishlist.' },
          '404': { description: 'Product not found.' },
        },
      },
    },
    '/wishlist/items/{itemId}': {
      delete: {
        tags: ['Wishlist'],
        summary: 'Remove item from wishlist',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Item removed from wishlist.' },
          '404': { description: 'Wishlist item not found.' },
        },
      },
    },
    '/wishlist/items/{itemId}/move-to-cart': {
      post: {
        tags: ['Wishlist'],
        summary: 'Move wishlisted item into shopping cart',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Item moved to cart successfully.' },
          '404': { description: 'Wishlist item or product not found.' },
        },
      },
    },
    // =========================================================================
    // Shipping & Delivery Management (Phase 11)
    // =========================================================================
    '/shipping/methods': {
      get: {
        tags: ['Shipping & Delivery'],
        summary: 'Get Available Shipping Methods for Location',
        description:
          'Returns active shipping methods (standard, express) for a given country and state.',
        parameters: [
          { name: 'country', in: 'query', schema: { type: 'string', default: 'Nigeria' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Shipping methods retrieved.' },
          '400': { description: 'State parameter missing.' },
        },
      },
    },
    '/shipping/availability': {
      get: {
        tags: ['Shipping & Delivery'],
        summary: 'Check Shipping Service Availability',
        description: 'Checks whether Cartiva delivers to the requested country and state.',
        parameters: [
          { name: 'country', in: 'query', schema: { type: 'string', default: 'Nigeria' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Availability status returned.' },
        },
      },
    },
    '/shipping/quotes': {
      post: {
        tags: ['Shipping & Delivery'],
        summary: 'Calculate Authoritative Shipping Quote',
        description:
          'Authoritative server calculation of shipping fees using integer minor units, active rates, and weight tiers.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  addressId: { type: 'string' },
                  destination: {
                    type: 'object',
                    properties: {
                      country: { type: 'string' },
                      state: { type: 'string' },
                      city: { type: 'string' },
                      postalCode: { type: 'string' },
                    },
                  },
                  shippingMethodId: { type: 'string' },
                  guestToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authoritative quotes returned.' },
          '400': { description: 'Invalid address or destination.' },
        },
      },
    },
    '/admin/shipping/configurations': {
      get: {
        tags: ['Admin Shipping'],
        summary: 'List Shipping Configurations',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Shipping configurations retrieved.' },
          '401': { description: 'Unauthorized.' },
          '403': { description: 'Admin access required.' },
        },
      },
      post: {
        tags: ['Admin Shipping'],
        summary: 'Create Shipping Configuration',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Configuration created.' },
          '400': { description: 'Validation failed.' },
          '403': { description: 'Admin access required.' },
        },
      },
    },
    '/admin/shipping/configurations/{id}': {
      get: {
        tags: ['Admin Shipping'],
        summary: 'Get Shipping Configuration by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Configuration retrieved.' },
          '404': { description: 'Configuration not found.' },
        },
      },
      patch: {
        tags: ['Admin Shipping'],
        summary: 'Update Shipping Configuration',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Configuration updated.' },
          '404': { description: 'Configuration not found.' },
        },
      },
      delete: {
        tags: ['Admin Shipping'],
        summary: 'Delete Shipping Configuration',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Configuration deleted.' },
        },
      },
    },
    '/admin/shipping/configurations/{id}/status': {
      patch: {
        tags: ['Admin Shipping'],
        summary: 'Toggle Shipping Configuration Status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Status toggled successfully.' },
        },
      },
    },
    '/checkout/session': {
      get: {
        tags: ['Checkout & Order Processing'],
        summary: 'Get or Initialize Checkout Session',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Checkout session retrieved.' },
          '400': { description: 'Cart is empty.' },
        },
      },
    },
    '/checkout/session/address': {
      patch: {
        tags: ['Checkout & Order Processing'],
        summary: 'Set Checkout Delivery Address',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['addressId'],
                properties: { addressId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Address selected successfully.' },
          '403': { description: 'Address ownership denied.' },
          '404': { description: 'Address not found.' },
        },
      },
    },
    '/checkout/session/shipping': {
      patch: {
        tags: ['Checkout & Order Processing'],
        summary: 'Set Checkout Shipping Method',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['shippingMethodId'],
                properties: { shippingMethodId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Shipping method selected successfully.' },
          '400': { description: 'Destination unsupported or incomplete checkout.' },
          '404': { description: 'Shipping configuration not found.' },
        },
      },
    },
    '/checkout/session/summary': {
      get: {
        tags: ['Checkout & Order Processing'],
        summary: 'Get Authoritative Checkout Summary',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Summary retrieved successfully.' },
        },
      },
    },
    '/checkout/validate': {
      post: {
        tags: ['Checkout & Order Processing'],
        summary: 'Validate Checkout State',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Validation results returned.' },
        },
      },
    },
    '/checkout/confirm': {
      post: {
        tags: ['Checkout & Order Processing'],
        summary: 'Confirm Order & Reserve Inventory',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['acceptTerms'],
                properties: {
                  acceptTerms: { type: 'boolean' },
                  customerNotes: { type: 'string' },
                  idempotencyKey: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Order created successfully. Pending payment.' },
          '400': { description: 'Stock reservation failure or validation error.' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Customer Orders'],
        summary: 'Get Customer Order History',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Orders retrieved.' },
        },
      },
    },
    '/orders/{orderId}': {
      get: {
        tags: ['Customer Orders'],
        summary: 'Get Customer Order Detail',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Order detail retrieved.' },
          '403': { description: 'Order access denied.' },
          '404': { description: 'Order not found.' },
        },
      },
    },
    '/orders/{orderId}/cancel': {
      post: {
        tags: ['Customer Orders'],
        summary: 'Cancel Customer Order',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { reason: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Order cancelled and reservation released.' },
          '400': { description: 'Order ineligible for cancellation.' },
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin Orders'],
        summary: 'List All Orders (Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'orderStatus', in: 'query', schema: { type: 'string' } },
          { name: 'paymentStatus', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Orders retrieved.' },
        },
      },
    },
    '/admin/orders/{orderId}': {
      get: {
        tags: ['Admin Orders'],
        summary: 'Get Order Detail (Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Order detail retrieved.' },
        },
      },
    },
    '/admin/orders/{orderId}/status': {
      patch: {
        tags: ['Admin Orders'],
        summary: 'Update Order Status (Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderStatus'],
                properties: {
                  orderStatus: { type: 'string' },
                  trackingNumber: { type: 'string' },
                  carrier: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Order status updated.' },
          '400': { description: 'Invalid status transition.' },
        },
      },
    },
    '/admin/orders/{orderId}/audit': {
      get: {
        tags: ['Admin Orders'],
        summary: 'Get Order Audit History (Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Audit history retrieved.' },
        },
      },
    },
    '/payments/initialize': {
      post: {
        tags: ['Payment & Financial Processing'],
        summary: 'Initialize Payment Session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderNumber'],
                properties: {
                  orderNumber: { type: 'string', example: 'ORD-20261104-ABC123' },
                  callbackUrl: { type: 'string', example: 'http://localhost:5180/payment/callback' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Payment initialized; returns gateway authorization URL.' },
          '400': { description: 'Order not eligible or already paid.' },
        },
      },
    },
    '/payments/{reference}/verify': {
      get: {
        tags: ['Payment & Financial Processing'],
        summary: 'Verify Transaction Directly with Gateway',
        parameters: [{ name: 'reference', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Authoritative transaction verification result.' },
          '404': { description: 'Transaction reference not found.' },
        },
      },
    },
    '/payments': {
      get: {
        tags: ['Payment & Financial Processing'],
        summary: 'List Customer Payment History',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paginated customer payments.' },
        },
      },
    },
    '/webhooks/paystack': {
      post: {
        tags: ['Payment & Financial Processing'],
        summary: 'Paystack Webhook Receiver (HMAC SHA512 Verified)',
        responses: {
          '200': { description: 'Webhook event verified and processed idempotently.' },
          '401': { description: 'Invalid signature.' },
        },
      },
    },
    '/admin/payments': {
      get: {
        tags: ['Payment & Financial Processing'],
        summary: 'List Administrative Payments',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'All transactions with administrative filters.' },
        },
      },
    },
    '/admin/payments/{paymentId}/refunds': {
      post: {
        tags: ['Payment & Financial Processing'],
        summary: 'Process Refund (Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'paymentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  amount: { type: 'number', description: 'Major currency units. Omit for full refund.' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Refund queued and logged.' },
        },
      },
    },
    '/admin/payments/reconciliation': {
      get: {
        tags: ['Payment & Financial Processing'],
        summary: 'Run Financial Ledger Reconciliation (Admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Reconciliation comparison results against Paystack.' },
        },
      },
    },
    '/orders/{orderId}/fulfilment': {
      get: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Get Customer Order Fulfilment Info',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Fulfilment and shipment details retrieved.' },
          '403': { description: 'Ownership check failed.' },
        },
      },
    },
    '/orders/{orderId}/tracking': {
      get: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Get Customer Order Tracking Timeline',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Chronological tracking timeline retrieved.' },
          '403': { description: 'Ownership check failed.' },
        },
      },
    },
    '/admin/fulfilment': {
      get: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'List Orders for Fulfilment (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Fulfilment orders list retrieved.' },
        },
      },
    },
    '/admin/fulfilment/{orderId}': {
      get: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Get Fulfilment Order Details (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Order fulfilment details and shipment timeline.' },
        },
      },
    },
    '/admin/fulfilment/{orderId}/status': {
      patch: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Advance Fulfilment Status (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Status updated.' },
          '400': { description: 'Invalid transition or unpaid order.' },
        },
      },
    },
    '/admin/fulfilment/{orderId}/shipments': {
      post: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Create Shipment for Paid Order (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Shipment created.' },
          '400': { description: 'Order not eligible for fulfilment.' },
          '409': { description: 'Active shipment already exists.' },
        },
      },
    },
    '/admin/shipments/{shipmentId}': {
      patch: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Update Shipment Details (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Shipment updated.' },
        },
      },
    },
    '/admin/shipments/{shipmentId}/events': {
      post: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Append Tracking Event to Shipment (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Event appended.' },
        },
      },
    },
    '/admin/shipments/{shipmentId}/delivery-confirmation': {
      post: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Confirm Final Delivery (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Delivery confirmed.' },
          '400': { description: 'Already confirmed delivered.' },
        },
      },
    },
    '/admin/shipments/{shipmentId}/exceptions': {
      post: {
        tags: ['Order Fulfilment & Tracking'],
        summary: 'Record Delivery Exception (Admin/Staff)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Exception recorded in timeline.' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Access Token passed in the Authorization header.',
      },
    },
    schemas: {
      ApiResponseEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully.' },
          data: { type: 'object' },
        },
        required: ['success', 'message', 'data'],
      },
      ApiErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed for incoming request data.' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Invalid email address' },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string', example: '6b88653f-70ac-44db-b490-b9491a76eafd' },
            },
            required: ['code', 'message', 'timestamp', 'requestId'],
          },
        },
        required: ['success', 'error'],
      },
      HealthResponseEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Service is operational.' },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              service: { type: 'string', example: 'cartiva-mini-api' },
              version: { type: 'string', example: '1.0.0' },
              timestamp: { type: 'string', format: 'date-time' },
              uptimeSeconds: { type: 'integer', example: 342 },
              environment: { type: 'string', example: 'development' },
              memoryUsage: {
                type: 'object',
                properties: {
                  heapUsedMB: { type: 'integer', example: 48 },
                  heapTotalMB: { type: 'integer', example: 64 },
                  rssMB: { type: 'integer', example: 128 },
                },
              },
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'connected' },
                  message: {
                    type: 'string',
                    example: 'MongoDB connection active.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Serve JSON OpenAPI spec
docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiSpec);
});

// Serve interactive Swagger UI HTML via CDN (Zero new backend runtime dependencies)
docsRouter.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cartiva Mini API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body { margin: 0; background-color: #0f172a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1200px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/v1/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});
