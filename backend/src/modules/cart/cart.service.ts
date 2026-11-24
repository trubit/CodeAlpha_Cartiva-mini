/**
 * Cartiva Mini — Shopping Cart Service
 * Comprehensive shopping cart business logic, server-side price validation,
 * atomic stock verification, and guest-to-customer cart merging.
 */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { ProductStatus } from '@shared/enums.js';
import type {
  CartDto,
  CartItemDto,
  CartPriceChangeDto,
  AddCartItemDto,
  CartMergeResponseDto,
  CartMergeSummaryDto,
} from '@shared/api.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { CART_CONSTANTS } from './cart.constants.js';
import { cartRepository } from './cart.repository.js';
import { Product, type ProductDocument } from '../../models/Product.model.js';
import type { CartDocument } from '../../models/Cart.model.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';

export interface CartContext {
  userId?: string;
  guestToken?: string;
}

export class CartService {
  /**
   * Calculates the authoritative database price for a product or variant.
   * Never trusts client-submitted prices or discounts.
   */
  public determineAuthoritativePrice(
    product: ProductDocument,
    variantId?: string
  ): { unitPrice: number; unitPriceMinor: number; currency: string } {
    let unitPrice = product.regularPrice;

    if (variantId && product.variants?.length) {
      const variant = product.variants.find((v) => v._id?.toString() === variantId);
      if (variant) {
        unitPrice = variant.price;
      }
    } else {
      // Check active sale window
      const now = new Date();
      const isSaleActive =
        product.salePrice !== undefined &&
        product.salePrice !== null &&
        product.salePrice > 0 &&
        (!product.saleStartDate || product.saleStartDate <= now) &&
        (!product.saleEndDate || product.saleEndDate >= now);

      if (isSaleActive && product.salePrice) {
        unitPrice = product.salePrice;
      }
    }

    return {
      unitPrice,
      unitPriceMinor: Math.round(unitPrice * 100),
      currency: product.currency || CART_CONSTANTS.DEFAULT_CURRENCY,
    };
  }

  /**
   * Retrieves or creates a cart for the current context (authenticated customer or guest).
   */
  public async getOrCreateCart(
    context: CartContext
  ): Promise<{ cart: CartDocument; guestToken?: string }> {
    if (context.userId) {
      let cart = await cartRepository.findCartByUserId(context.userId);
      if (!cart) {
        cart = await cartRepository.createCart({
          userId: new Types.ObjectId(context.userId),
          items: [],
          currency: CART_CONSTANTS.DEFAULT_CURRENCY,
        });
      }
      return { cart };
    }

    // Guest Cart flow
    if (context.guestToken) {
      const existing = await cartRepository.findCartBySessionId(context.guestToken);
      if (existing) {
        return { cart: existing, guestToken: context.guestToken };
      }
    }

    // Generate new guest token and cart
    const newGuestToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CART_CONSTANTS.GUEST_CART_TTL_SECONDS * 1000);

    const cart = await cartRepository.createCart({
      sessionId: newGuestToken,
      items: [],
      currency: CART_CONSTANTS.DEFAULT_CURRENCY,
      expiresAt,
    });

    return { cart, guestToken: newGuestToken };
  }

  /**
   * Retrieves and formats the cart with real-time stock and authoritative price revalidation.
   */
  public async getCart(context: CartContext): Promise<{ cart: CartDto; guestToken?: string }> {
    const { cart, guestToken } = await this.getOrCreateCart(context);
    const cartDto = await this.formatCartDto(cart);
    return { cart: cartDto, guestToken };
  }

  /**
   * Adds an item to the shopping cart.
   */
  public async addItem(
    context: CartContext,
    data: AddCartItemDto
  ): Promise<{ cart: CartDto; guestToken?: string }> {
    const quantity = Math.floor(data.quantity || CART_CONSTANTS.DEFAULT_QUANTITY);
    if (quantity < CART_CONSTANTS.MIN_QUANTITY_PER_ITEM) {
      throw AppError.badRequest('Quantity must be at least 1.', ErrorCodes.INVALID_CART_QUANTITY);
    }
    if (quantity > CART_CONSTANTS.MAX_QUANTITY_PER_ITEM) {
      throw AppError.badRequest(
        `Quantity cannot exceed ${CART_CONSTANTS.MAX_QUANTITY_PER_ITEM}.`,
        ErrorCodes.INVALID_CART_QUANTITY
      );
    }

    // 1. Resolve product & variant
    const product = await Product.findById(data.productId);
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw AppError.notFound(
        'Product not found or is currently unavailable for purchase.',
        ErrorCodes.PRODUCT_NOT_FOUND
      );
    }

    if (product.hasVariants && !data.variantId) {
      throw AppError.badRequest(
        'Please select a specific product variant.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 2. Resolve stock availability via Phase 8 inventory integration
    const target = await inventoryRepository.resolveTarget(data.productId, data.variantId);
    if (!target) {
      throw AppError.notFound(
        'Inventory target could not be resolved.',
        ErrorCodes.INVENTORY_NOT_FOUND
      );
    }

    if (target.isInventoryTracked && target.availableQuantity < quantity) {
      throw AppError.badRequest(
        `Requested quantity (${quantity}) exceeds currently available stock (${target.availableQuantity}).`,
        ErrorCodes.INSUFFICIENT_STOCK
      );
    }

    // 3. Authoritative price & currency determination
    const { unitPrice, currency } = this.determineAuthoritativePrice(product, data.variantId);

    // 4. Retrieve or initialize cart
    const { cart, guestToken } = await this.getOrCreateCart(context);

    // Currency consistency check
    if (cart.items.length > 0 && cart.currency && cart.currency !== currency) {
      throw AppError.badRequest(
        `Currency mismatch: Cart currency is ${cart.currency}, but product is priced in ${currency}.`,
        ErrorCodes.CART_CURRENCY_MISMATCH
      );
    }
    cart.currency = currency;

    // 5. Check if item already exists in cart
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === data.productId &&
        (data.variantId ? item.variantId?.toString() === data.variantId : !item.variantId)
    );

    if (existingIndex > -1) {
      const existingItem = cart.items[existingIndex]!;
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > CART_CONSTANTS.MAX_QUANTITY_PER_ITEM) {
        throw AppError.badRequest(
          `Total item quantity in cart cannot exceed ${CART_CONSTANTS.MAX_QUANTITY_PER_ITEM}.`,
          ErrorCodes.INVALID_CART_QUANTITY
        );
      }

      if (target.isInventoryTracked && target.availableQuantity < newQuantity) {
        throw AppError.badRequest(
          `Cannot add ${quantity} more item(s). Total in cart (${newQuantity}) exceeds available stock (${target.availableQuantity}).`,
          ErrorCodes.INSUFFICIENT_STOCK
        );
      }

      existingItem.quantity = newQuantity;
      existingItem.unitPrice = unitPrice;
    } else {
      // Find thumbnail
      let thumbnailUrl: string | undefined;
      if (data.variantId && target.isVariant) {
        const variant = product.variants?.find((v) => v._id?.toString() === data.variantId);
        thumbnailUrl = variant?.imageUrl;
      }
      if (!thumbnailUrl && product.images?.length) {
        const thumb = product.images.find((img) => img.isThumbnail) || product.images[0];
        thumbnailUrl = thumb?.url;
      }

      cart.items.push({
        productId: new Types.ObjectId(data.productId) as unknown as string,
        variantId: data.variantId
          ? (new Types.ObjectId(data.variantId) as unknown as string)
          : undefined,
        sku: target.sku || product.sku,
        title: target.variantTitle ? `${product.title} (${target.variantTitle})` : product.title,
        unitPrice,
        quantity,
        thumbnailUrl,
      });
    }

    await cartRepository.saveCart(cart);
    const cartDto = await this.formatCartDto(cart);
    return { cart: cartDto, guestToken };
  }

  /**
   * Updates quantity for an existing cart item.
   */
  public async updateItemQuantity(
    context: CartContext,
    itemId: string,
    quantity: number
  ): Promise<{ cart: CartDto; guestToken?: string }> {
    const qty = Math.floor(quantity);
    if (qty < CART_CONSTANTS.MIN_QUANTITY_PER_ITEM) {
      throw AppError.badRequest('Quantity must be at least 1.', ErrorCodes.INVALID_CART_QUANTITY);
    }
    if (qty > CART_CONSTANTS.MAX_QUANTITY_PER_ITEM) {
      throw AppError.badRequest(
        `Quantity cannot exceed ${CART_CONSTANTS.MAX_QUANTITY_PER_ITEM}.`,
        ErrorCodes.INVALID_CART_QUANTITY
      );
    }

    const { cart, guestToken } = await this.getOrCreateCart(context);
    const item = cart.items.find((i) => i._id?.toString() === itemId);
    if (!item) {
      throw AppError.notFound('Cart item not found.', ErrorCodes.CART_ITEM_NOT_FOUND);
    }

    // Validate available stock
    const target = await inventoryRepository.resolveTarget(
      item.productId.toString(),
      item.variantId?.toString()
    );

    if (target && target.isInventoryTracked && target.availableQuantity < qty) {
      throw AppError.badRequest(
        `Requested quantity (${qty}) exceeds available stock (${target.availableQuantity}).`,
        ErrorCodes.INSUFFICIENT_STOCK
      );
    }

    // Refresh authoritative price
    if (target) {
      const { unitPrice } = this.determineAuthoritativePrice(
        target.product,
        item.variantId?.toString()
      );
      item.unitPrice = unitPrice;
    }

    item.quantity = qty;
    await cartRepository.saveCart(cart);
    const cartDto = await this.formatCartDto(cart);
    return { cart: cartDto, guestToken };
  }

  /**
   * Removes an individual item from the cart.
   */
  public async removeItem(
    context: CartContext,
    itemId: string
  ): Promise<{ cart: CartDto; guestToken?: string }> {
    const { cart, guestToken } = await this.getOrCreateCart(context);
    const initialCount = cart.items.length;

    cart.items = cart.items.filter((i) => i._id?.toString() !== itemId);
    if (cart.items.length === initialCount) {
      throw AppError.notFound('Cart item not found.', ErrorCodes.CART_ITEM_NOT_FOUND);
    }

    await cartRepository.saveCart(cart);
    const cartDto = await this.formatCartDto(cart);
    return { cart: cartDto, guestToken };
  }

  /**
   * Clears all items and coupon discounts from the cart.
   */
  public async clearCart(context: CartContext): Promise<{ cart: CartDto; guestToken?: string }> {
    const { cart, guestToken } = await this.getOrCreateCart(context);
    cart.items = [];
    cart.couponCode = undefined;
    cart.discountAmount = 0;
    cart.subtotal = 0;

    await cartRepository.saveCart(cart);
    const cartDto = await this.formatCartDto(cart);
    return { cart: cartDto, guestToken };
  }

  /**
   * Merges an existing guest cart into an authenticated user's cart upon login/registration.
   */
  public async mergeGuestCart(userId: string, guestToken?: string): Promise<CartMergeResponseDto> {
    if (!guestToken) {
      const { cart } = await this.getCart({ userId });
      return {
        cart,
        mergeSummary: {
          mergedItemsCount: 0,
          updatedItemsCount: 0,
          unavailableItemsCount: 0,
        },
      };
    }

    // Retrieve guest cart
    const guestCart = await cartRepository.findCartBySessionId(guestToken);
    if (!guestCart || guestCart.items.length === 0) {
      if (guestCart) {
        await cartRepository.deleteCartById(guestCart._id.toString());
      }
      const { cart } = await this.getCart({ userId });
      return {
        cart,
        mergeSummary: {
          mergedItemsCount: 0,
          updatedItemsCount: 0,
          unavailableItemsCount: 0,
        },
      };
    }

    // Retrieve or initialize customer's authenticated cart
    const { cart: userCart } = await this.getOrCreateCart({ userId });

    let mergedItemsCount = 0;
    let updatedItemsCount = 0;
    let unavailableItemsCount = 0;
    const warnings: string[] = [];

    for (const guestItem of guestCart.items) {
      const product = await Product.findById(guestItem.productId);
      if (!product || product.status !== ProductStatus.PUBLISHED) {
        unavailableItemsCount++;
        warnings.push(`"${guestItem.title}" is no longer available and was excluded.`);
        continue;
      }

      const target = await inventoryRepository.resolveTarget(
        guestItem.productId.toString(),
        guestItem.variantId?.toString()
      );

      if (!target || (target.isInventoryTracked && target.availableQuantity <= 0)) {
        unavailableItemsCount++;
        warnings.push(`"${guestItem.title}" is out of stock and was excluded.`);
        continue;
      }

      const { unitPrice, currency } = this.determineAuthoritativePrice(
        product,
        guestItem.variantId?.toString()
      );

      if (userCart.items.length > 0 && userCart.currency && userCart.currency !== currency) {
        unavailableItemsCount++;
        warnings.push(
          `"${guestItem.title}" currency (${currency}) does not match cart currency (${userCart.currency}).`
        );
        continue;
      }
      userCart.currency = currency;

      // Check if item already exists in user's cart
      const existing = userCart.items.find(
        (i) =>
          i.productId.toString() === guestItem.productId.toString() &&
          (guestItem.variantId
            ? i.variantId?.toString() === guestItem.variantId.toString()
            : !i.variantId)
      );

      if (existing) {
        let combined = existing.quantity + guestItem.quantity;
        combined = Math.min(combined, CART_CONSTANTS.MAX_QUANTITY_PER_ITEM);
        if (target.isInventoryTracked) {
          combined = Math.min(combined, target.availableQuantity);
        }
        existing.quantity = combined;
        existing.unitPrice = unitPrice;
        updatedItemsCount++;
      } else {
        let qty = Math.min(guestItem.quantity, CART_CONSTANTS.MAX_QUANTITY_PER_ITEM);
        if (target.isInventoryTracked) {
          qty = Math.min(qty, target.availableQuantity);
        }
        userCart.items.push({
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          sku: target.sku || product.sku,
          title: guestItem.title,
          unitPrice,
          quantity: qty,
          thumbnailUrl: guestItem.thumbnailUrl,
        });
        mergedItemsCount++;
      }
    }

    await cartRepository.saveCart(userCart);
    // Delete merged guest cart to prevent duplicate reuse
    await cartRepository.deleteCartById(guestCart._id.toString());

    const cartDto = await this.formatCartDto(userCart);

    const mergeSummary: CartMergeSummaryDto = {
      mergedItemsCount,
      updatedItemsCount,
      unavailableItemsCount,
      ...(warnings.length ? { warnings } : {}),
    };

    return { cart: cartDto, mergeSummary };
  }

  /**
   * Formats a CartDocument into a client-safe CartDto with verified minor unit calculations,
   * price change notifications, and real-time inventory availability status.
   */
  private async formatCartDto(cart: CartDocument): Promise<CartDto> {
    const formattedItems: CartItemDto[] = [];
    const priceChanges: CartPriceChangeDto[] = [];
    let hasUnavailableItems = false;
    let cartModified = false;

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      const isPublished = product?.status === ProductStatus.PUBLISHED;

      let isAvailable = false;
      let availableStock: number | undefined;
      let availabilityMessage: string | undefined;

      if (!product || !isPublished) {
        isAvailable = false;
        hasUnavailableItems = true;
        availabilityMessage = 'This product is no longer available.';
      } else {
        // Resolve stock via Phase 8 inventory engine
        const target = await inventoryRepository.resolveTarget(
          item.productId.toString(),
          item.variantId?.toString()
        );

        if (!target) {
          isAvailable = false;
          hasUnavailableItems = true;
          availabilityMessage = 'Inventory details could not be verified.';
        } else if (!target.isInventoryTracked) {
          isAvailable = true;
          availableStock = 999;
        } else if (target.availableQuantity <= 0) {
          isAvailable = false;
          hasUnavailableItems = true;
          availableStock = 0;
          availabilityMessage = 'Item is currently out of stock.';
        } else if (item.quantity > target.availableQuantity) {
          isAvailable = false;
          hasUnavailableItems = true;
          availableStock = target.availableQuantity;
          availabilityMessage = `Only ${target.availableQuantity} item(s) available in stock.`;
        } else {
          isAvailable = true;
          availableStock = target.availableQuantity;
        }

        // Authoritative price check
        const { unitPrice: authoritativePrice } = this.determineAuthoritativePrice(
          product,
          item.variantId?.toString()
        );

        if (item.unitPrice !== authoritativePrice) {
          priceChanges.push({
            itemId: item._id?.toString() || '',
            productId: product._id.toString(),
            title: product.title,
            oldPrice: item.unitPrice,
            newPrice: authoritativePrice,
            difference: Math.round((authoritativePrice - item.unitPrice) * 100) / 100,
          });

          item.unitPrice = authoritativePrice;
          cartModified = true;
        }

        // Update snapshot details if out-of-date
        if (target) {
          const freshSku = target.sku || product.sku;
          if (item.sku !== freshSku) {
            item.sku = freshSku;
            cartModified = true;
          }
        }
      }

      const unitPriceMinor = Math.round(item.unitPrice * 100);
      const lineTotalMinor = unitPriceMinor * item.quantity;
      const lineTotal = lineTotalMinor / 100;

      const priceChangeRecord = priceChanges.find((pc) => pc.itemId === item._id?.toString());

      formattedItems.push({
        id: item._id?.toString() || '',
        productId: item.productId.toString(),
        variantId: item.variantId?.toString(),
        sku: item.sku,
        title: item.title,
        unitPrice: item.unitPrice,
        unitPriceMinor,
        quantity: item.quantity,
        lineTotal,
        lineTotalMinor,
        thumbnailUrl: item.thumbnailUrl,
        slug: product?.slug,
        currency: cart.currency || CART_CONSTANTS.DEFAULT_CURRENCY,
        isAvailable,
        availableStock,
        availabilityMessage,
        priceChanged: !!priceChangeRecord,
        previousPrice: priceChangeRecord?.oldPrice,
        currentPrice: priceChangeRecord?.newPrice,
      });
    }

    if (cartModified) {
      await cartRepository.saveCart(cart);
    }

    const subtotalMinor = formattedItems.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    const subtotal = subtotalMinor / 100;
    const discountAmountMinor = Math.round((cart.discountAmount || 0) * 100);
    const totalMinor = Math.max(0, subtotalMinor - discountAmountMinor);
    const total = totalMinor / 100;

    return {
      id: cart._id.toString(),
      userId: cart.userId?.toString(),
      guestCartToken: cart.sessionId,
      items: formattedItems,
      itemCount: formattedItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      subtotalMinor,
      discountAmount: cart.discountAmount || 0,
      discountAmountMinor,
      total,
      totalMinor,
      currency: cart.currency || CART_CONSTANTS.DEFAULT_CURRENCY,
      couponCode: cart.couponCode,
      hasUnavailableItems,
      hasPriceChanges: priceChanges.length > 0,
      ...(priceChanges.length ? { priceChanges } : {}),
      expiresAt: cart.expiresAt ? cart.expiresAt.toISOString() : undefined,
      updatedAt: cart.updatedAt ? cart.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const cartService = new CartService();
