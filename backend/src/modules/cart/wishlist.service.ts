/**
 * Cartiva Mini — Customer Wishlist Service
 * Handles customer wishlist bookmarks, availability status revalidation,
 * deduplication, and move-to-cart operations.
 */
import { Types } from 'mongoose';
import { ProductStatus } from '@shared/enums.js';
import type {
  WishlistDto,
  WishlistItemDto,
  CartDto,
  MoveWishlistItemToCartDto,
} from '@shared/api.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { cartRepository } from './cart.repository.js';
import { cartService } from './cart.service.js';
import { Product } from '../../models/Product.model.js';
import type { WishlistDocument } from '../../models/Wishlist.model.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';

export class WishlistService {
  /**
   * Retrieves a customer's wishlist with populated product details and availability.
   */
  public async getWishlist(userId: string): Promise<WishlistDto> {
    let wishlist = await cartRepository.findWishlistByUserId(userId);
    if (!wishlist) {
      wishlist = await cartRepository.createWishlist(userId);
    }
    return this.formatWishlistDto(wishlist);
  }

  /**
   * Adds a product to customer's wishlist. Deduplicates idempotent requests.
   */
  public async addItem(userId: string, productId: string): Promise<WishlistDto> {
    const product = await Product.findById(productId);
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw AppError.notFound(
        'Product not found or is currently unavailable.',
        ErrorCodes.PRODUCT_NOT_FOUND
      );
    }

    let wishlist = await cartRepository.findWishlistByUserId(userId);
    if (!wishlist) {
      wishlist = await cartRepository.createWishlist(userId);
    }

    const alreadyExists = wishlist.items.some((item) => item.productId.toString() === productId);

    if (!alreadyExists) {
      wishlist.items.push({
        productId: new Types.ObjectId(productId) as unknown as string,
        addedAt: new Date(),
      });
      await cartRepository.saveWishlist(wishlist);
    }

    return this.formatWishlistDto(wishlist);
  }

  /**
   * Removes a product from customer's wishlist by item ID or product ID.
   */
  public async removeItem(userId: string, itemId: string): Promise<WishlistDto> {
    const wishlist = await cartRepository.findWishlistByUserId(userId);
    if (!wishlist) {
      throw AppError.notFound('Wishlist not found.', ErrorCodes.WISHLIST_NOT_FOUND);
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item._id?.toString() !== itemId && item.productId.toString() !== itemId
    );

    if (wishlist.items.length === initialLength) {
      throw AppError.notFound('Wishlist item not found.', ErrorCodes.WISHLIST_ITEM_NOT_FOUND);
    }

    await cartRepository.saveWishlist(wishlist);
    return this.formatWishlistDto(wishlist);
  }

  /**
   * Moves a wishlisted product into the customer's shopping cart.
   */
  public async moveItemToCart(
    userId: string,
    itemId: string,
    options?: MoveWishlistItemToCartDto
  ): Promise<{ cart: CartDto; wishlist: WishlistDto }> {
    const wishlist = await cartRepository.findWishlistByUserId(userId);
    if (!wishlist) {
      throw AppError.notFound('Wishlist not found.', ErrorCodes.WISHLIST_NOT_FOUND);
    }

    const item = wishlist.items.find(
      (i) => i._id?.toString() === itemId || i.productId.toString() === itemId
    );

    if (!item) {
      throw AppError.notFound('Wishlist item not found.', ErrorCodes.WISHLIST_ITEM_NOT_FOUND);
    }

    const productId = item.productId.toString();

    // Add to cart via cartService
    const { cart } = await cartService.addItem(
      { userId },
      {
        productId,
        variantId: options?.variantId,
        quantity: options?.quantity || 1,
      }
    );

    // Remove from wishlist upon successful addition to cart
    wishlist.items = wishlist.items.filter(
      (i) => i._id?.toString() !== itemId && i.productId.toString() !== itemId
    );
    await cartRepository.saveWishlist(wishlist);

    const wishlistDto = await this.formatWishlistDto(wishlist);
    return { cart, wishlist: wishlistDto };
  }

  /**
   * Formats a WishlistDocument into a safe WishlistDto with live pricing and availability.
   */
  private async formatWishlistDto(wishlist: WishlistDocument): Promise<WishlistDto> {
    const formattedItems: WishlistItemDto[] = [];

    for (const item of wishlist.items) {
      const product = await Product.findById(item.productId);
      const isPublished = product?.status === ProductStatus.PUBLISHED;

      if (!product || !isPublished) {
        formattedItems.push({
          id: item._id?.toString() || item.productId.toString(),
          productId: item.productId.toString(),
          title: product?.title || 'Unavailable Product',
          slug: product?.slug || '',
          sku: product?.sku || '',
          regularPrice: product?.regularPrice || 0,
          currentPrice: 0,
          currency: product?.currency || 'NGN',
          isAvailable: false,
          availableStock: 0,
          addedAt: item.addedAt ? item.addedAt.toISOString() : new Date().toISOString(),
        });
        continue;
      }

      // Check authoritative price
      const { unitPrice } = cartService.determineAuthoritativePrice(product);

      // Check stock availability
      const target = await inventoryRepository.resolveTarget(product._id.toString());
      const isAvailable =
        !target?.isInventoryTracked || (target.availableQuantity && target.availableQuantity > 0);

      // Thumbnail
      let thumbnailUrl: string | undefined;
      if (product.images?.length) {
        const thumb = product.images.find((img) => img.isThumbnail) || product.images[0];
        thumbnailUrl = thumb?.url;
      }

      formattedItems.push({
        id: item._id?.toString() || item.productId.toString(),
        productId: product._id.toString(),
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        currentPrice: unitPrice,
        currency: product.currency || 'NGN',
        thumbnailUrl,
        isAvailable: !!isAvailable,
        availableStock: target?.availableQuantity ?? 0,
        addedAt: item.addedAt ? item.addedAt.toISOString() : new Date().toISOString(),
      });
    }

    return {
      id: wishlist._id.toString(),
      userId: wishlist.userId.toString(),
      items: formattedItems,
      itemCount: formattedItems.length,
      updatedAt: wishlist.updatedAt ? wishlist.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const wishlistService = new WishlistService();
