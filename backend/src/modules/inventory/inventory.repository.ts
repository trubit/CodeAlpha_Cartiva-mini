import { Types, type FilterQuery } from 'mongoose';
import { Product, type ProductDocument } from '../../models/Product.model.js';
import {
  InventoryMovement,
  type InventoryMovementDocument,
} from '../../models/InventoryMovement.model.js';
import {
  InventoryReservation,
  type InventoryReservationDocument,
} from '../../models/InventoryReservation.model.js';
import { Notification } from '../../models/Notification.model.js';
import {
  InventoryMovementType,
  InventoryStatus,
  NotificationType,
  NotificationChannel,
  ReservationStatus,
} from '@shared/enums.js';
import type { IInventoryReservationItem } from '@shared/models.types.js';
import type { InventoryItemDto, InventorySummaryDto } from '@shared/api.types.js';
import { INVENTORY_CONSTANTS } from './inventory.constants.js';
import { notificationService } from '../notifications/notification.service.js';
import type { InventoryQueryOptions, MovementQueryOptions } from './inventory.types.js';

export interface ResolvedInventoryTarget {
  product: ProductDocument;
  variantId?: string;
  variantTitle?: string;
  sku: string;
  isVariant: boolean;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isInventoryTracked: boolean;
}

export class InventoryRepository {
  /**
   * Resolves an inventory target by inventoryId (which could be a productId, variantId, or SKU).
   */
  public async resolveTarget(
    identifier: string,
    explicitVariantId?: string
  ): Promise<ResolvedInventoryTarget | null> {
    const isObjectId = Types.ObjectId.isValid(identifier);

    let product: ProductDocument | null = null;
    let targetVariantId: string | undefined = explicitVariantId;

    if (isObjectId) {
      // 1. Try finding product by ID
      product = await Product.findById(identifier);
      if (!product) {
        // 2. Try finding product that contains this ObjectId as a variant._id
        product = await Product.findOne({ 'variants._id': new Types.ObjectId(identifier) });
        if (product) {
          targetVariantId = identifier;
        }
      }
    }

    if (!product) {
      // 3. Try finding by SKU (parent SKU or variant SKU)
      const normalizedSku = identifier.toUpperCase();
      product = await Product.findOne({
        $or: [{ sku: normalizedSku }, { 'variants.sku': normalizedSku }],
      });
      if (product && !targetVariantId) {
        const matchingVariant = product.variants?.find((v) => v.sku === normalizedSku);
        if (matchingVariant) {
          targetVariantId = (
            matchingVariant as unknown as { _id: { toString(): string } }
          )._id.toString();
        }
      }
    }

    if (!product) return null;

    if (targetVariantId) {
      const variant = product.variants?.find(
        (v) => (v as unknown as { _id: { toString(): string } })._id.toString() === targetVariantId
      );
      if (!variant) return null;

      const onHand = variant.stockQuantity ?? 0;
      const reserved = (variant as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
      const threshold =
        (variant as unknown as { lowStockThreshold?: number }).lowStockThreshold ??
        product.lowStockThreshold ??
        INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
      const tracked =
        (variant as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;

      return {
        product,
        variantId: targetVariantId,
        variantTitle: variant.title,
        sku: variant.sku,
        isVariant: true,
        onHandQuantity: onHand,
        reservedQuantity: reserved,
        availableQuantity: Math.max(0, onHand - reserved),
        lowStockThreshold: threshold,
        isInventoryTracked: tracked,
      };
    }

    // Target is parent product
    const onHand = product.stockQuantity ?? 0;
    const reserved = (product as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
    const threshold = product.lowStockThreshold ?? INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
    const tracked =
      (product as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;

    return {
      product,
      sku: product.sku,
      isVariant: false,
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      availableQuantity: Math.max(0, onHand - reserved),
      lowStockThreshold: threshold,
      isInventoryTracked: tracked,
    };
  }

  /**
   * Atomic stock increment (e.g. Receive stock).
   */
  public async atomicIncrementStock(
    productId: string,
    variantId: string | undefined,
    delta: number
  ): Promise<{ previousStock: number; newStock: number } | null> {
    if (variantId) {
      const updated = await Product.findOneAndUpdate(
        { _id: new Types.ObjectId(productId), 'variants._id': new Types.ObjectId(variantId) },
        {
          $inc: {
            'variants.$.stockQuantity': delta,
            stockQuantity: delta,
          },
        },
        { new: false } // return previous doc to calculate previous and new
      );
      if (!updated) return null;

      const prevVariant = updated.variants.find(
        (v) => (v as unknown as { _id: Types.ObjectId })._id.toString() === variantId
      );
      const prevStock = prevVariant?.stockQuantity ?? 0;
      return { previousStock: prevStock, newStock: prevStock + delta };
    }

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stockQuantity: delta } },
      { new: false }
    );
    if (!updated) return null;

    const prevStock = updated.stockQuantity ?? 0;
    return { previousStock: prevStock, newStock: prevStock + delta };
  }

  /**
   * Atomic stock decrement with overselling protection (e.g. Deduct stock for damage/loss).
   * Ensures new stock cannot fall below 0.
   */
  public async atomicDecrementStock(
    productId: string,
    variantId: string | undefined,
    delta: number
  ): Promise<{ previousStock: number; newStock: number } | null> {
    if (variantId) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          variants: {
            $elemMatch: {
              _id: new Types.ObjectId(variantId),
              stockQuantity: { $gte: delta },
            },
          },
        },
        {
          $inc: {
            'variants.$.stockQuantity': -delta,
            stockQuantity: -delta,
          },
        },
        { new: false }
      );
      if (!updated) return null;

      const prevVariant = updated.variants.find(
        (v) => (v as unknown as { _id: Types.ObjectId })._id.toString() === variantId
      );
      const prevStock = prevVariant?.stockQuantity ?? 0;
      return { previousStock: prevStock, newStock: prevStock - delta };
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: new Types.ObjectId(productId),
        stockQuantity: { $gte: delta },
      },
      { $inc: { stockQuantity: -delta } },
      { new: false }
    );
    if (!updated) return null;

    const prevStock = updated.stockQuantity ?? 0;
    return { previousStock: prevStock, newStock: prevStock - delta };
  }

  /**
   * Controlled manual stock adjustment to a target quantity.
   */
  public async setStockQuantity(
    productId: string,
    variantId: string | undefined,
    targetQuantity: number
  ): Promise<{ previousStock: number; newStock: number } | null> {
    if (variantId) {
      const currentDoc = await Product.findOne({
        _id: new Types.ObjectId(productId),
        'variants._id': new Types.ObjectId(variantId),
      });
      if (!currentDoc) return null;

      const variant = currentDoc.variants.find(
        (v) => (v as unknown as { _id: Types.ObjectId })._id.toString() === variantId
      );
      const previousStock = variant?.stockQuantity ?? 0;
      const difference = targetQuantity - previousStock;

      const updated = await Product.findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          'variants._id': new Types.ObjectId(variantId),
        },
        {
          $set: { 'variants.$.stockQuantity': targetQuantity },
          $inc: { stockQuantity: difference },
        },
        { new: true }
      );
      if (!updated) return null;

      return { previousStock, newStock: targetQuantity };
    }

    const currentDoc = await Product.findById(productId);
    if (!currentDoc) return null;

    const previousStock = currentDoc.stockQuantity ?? 0;
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: { stockQuantity: targetQuantity } },
      { new: true }
    );
    if (!updated) return null;

    return { previousStock, newStock: targetQuantity };
  }

  /**
   * Update low-stock threshold for product or variant.
   */
  public async updateThreshold(
    productId: string,
    variantId: string | undefined,
    lowStockThreshold: number
  ): Promise<boolean> {
    if (variantId) {
      const res = await Product.updateOne(
        { _id: new Types.ObjectId(productId), 'variants._id': new Types.ObjectId(variantId) },
        { $set: { 'variants.$.lowStockThreshold': lowStockThreshold } }
      );
      return res.modifiedCount > 0;
    }

    const res = await Product.updateOne(
      { _id: new Types.ObjectId(productId) },
      { $set: { lowStockThreshold } }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Atomic stock reservation with condition: availableStock (onHand - reserved) >= quantity.
   */
  public async atomicReserveItem(
    productId: string,
    variantId: string | undefined,
    quantity: number
  ): Promise<boolean> {
    if (variantId) {
      // Optimistic Concurrency Control (Compare-And-Swap) for variation reservation
      const MAX_ATTEMPTS = 15;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const product = await Product.findOne(
          {
            _id: new Types.ObjectId(productId),
            'variants._id': new Types.ObjectId(variantId),
          },
          { 'variants.$': 1, stockQuantity: 1, reservedQuantity: 1 }
        );
        if (!product || !product.variants || product.variants.length === 0) {
          return false;
        }

        const variant = product.variants[0];
        if (!variant) {
          return false;
        }
        const onHand = variant.stockQuantity ?? 0;
        const currentReserved =
          (variant as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;

        if (onHand - currentReserved < quantity) {
          // Strictly insufficient available stock
          return false;
        }

        // Atomically increment ONLY if reservedQuantity has not been mutated concurrently
        const res = await Product.updateOne(
          {
            _id: new Types.ObjectId(productId),
            variants: {
              $elemMatch: {
                _id: new Types.ObjectId(variantId),
                reservedQuantity: currentReserved,
              },
            },
          },
          {
            $inc: {
              'variants.$.reservedQuantity': quantity,
              reservedQuantity: quantity,
            },
          }
        );

        if (res.modifiedCount > 0) {
          return true;
        }
        // If modifiedCount is 0, another concurrent transaction updated it in this fraction of a millisecond.
        // Loop retries with freshly re-read state.
      }
      return false;
    }

    // Parent product atomic check using $expr condition in MongoDB update
    const res = await Product.updateOne(
      {
        _id: new Types.ObjectId(productId),
        $expr: {
          $gte: [
            {
              $subtract: [
                { $ifNull: ['$stockQuantity', 0] },
                { $ifNull: ['$reservedQuantity', 0] },
              ],
            },
            quantity,
          ],
        },
      },
      {
        $inc: { reservedQuantity: quantity },
      }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Atomic reservation release (decrements reservedQuantity with non-negative guard).
   */
  public async atomicReleaseItem(
    productId: string,
    variantId: string | undefined,
    quantity: number
  ): Promise<boolean> {
    if (variantId) {
      const res = await Product.updateOne(
        {
          _id: new Types.ObjectId(productId),
          variants: {
            $elemMatch: {
              _id: new Types.ObjectId(variantId),
              reservedQuantity: { $gte: quantity },
            },
          },
        },
        {
          $inc: {
            'variants.$.reservedQuantity': -quantity,
            reservedQuantity: -quantity,
          },
        }
      );
      return res.modifiedCount > 0;
    }

    const res = await Product.updateOne(
      {
        _id: new Types.ObjectId(productId),
        reservedQuantity: { $gte: quantity },
      },
      { $inc: { reservedQuantity: -quantity } }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Records an immutable entry in the inventory_movements ledger.
   */
  public async recordMovement(data: {
    productId: string;
    variantId?: string;
    sku: string;
    movementType: InventoryMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    referenceType?: 'order' | 'purchase_order' | 'manual' | 'reservation' | 'cart' | 'checkout';
    referenceId?: string;
    operatorId?: string;
  }): Promise<InventoryMovementDocument> {
    return InventoryMovement.create({
      productId: new Types.ObjectId(data.productId),
      variantId: data.variantId ? new Types.ObjectId(data.variantId) : undefined,
      sku: data.sku.toUpperCase(),
      movementType: data.movementType,
      quantity: data.quantity,
      previousStock: data.previousStock,
      newStock: data.newStock,
      reason: data.reason,
      referenceType: data.referenceType || 'manual',
      referenceId: data.referenceId,
      operatorId: data.operatorId ? new Types.ObjectId(data.operatorId) : undefined,
      timestamp: new Date(),
    });
  }

  /**
   * Reservation Model Data Access.
   */
  public async createReservation(data: {
    reservationId: string;
    userId?: string;
    sessionId?: string;
    items: IInventoryReservationItem[];
    status: ReservationStatus;
    expiresAt: Date;
    idempotencyKey?: string;
    referenceType?: 'cart' | 'checkout' | 'order' | 'manual';
    referenceId?: string;
  }): Promise<InventoryReservationDocument> {
    return InventoryReservation.create({
      reservationId: data.reservationId,
      userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
      sessionId: data.sessionId,
      items: data.items.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        variantId: i.variantId ? new Types.ObjectId(i.variantId) : undefined,
        sku: i.sku.toUpperCase(),
        quantity: i.quantity,
      })),
      status: data.status,
      expiresAt: data.expiresAt,
      idempotencyKey: data.idempotencyKey,
      referenceType: data.referenceType || 'cart',
      referenceId: data.referenceId,
    });
  }

  public async findReservationById(
    reservationId: string
  ): Promise<InventoryReservationDocument | null> {
    return InventoryReservation.findOne({ reservationId });
  }

  public async findReservationByIdempotencyKey(
    key: string
  ): Promise<InventoryReservationDocument | null> {
    return InventoryReservation.findOne({ idempotencyKey: key });
  }

  public async updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
    timestampField?: 'confirmedAt' | 'releasedAt'
  ): Promise<InventoryReservationDocument | null> {
    const update: Record<string, unknown> = { status };
    if (timestampField) {
      update[timestampField] = new Date();
    }
    return InventoryReservation.findOneAndUpdate(
      { reservationId },
      { $set: update },
      { new: true }
    );
  }

  /**
   * Finds movement history with pagination.
   */
  public async findMovements(options: MovementQueryOptions): Promise<{
    movements: InventoryMovementDocument[];
    total: number;
  }> {
    const filter: FilterQuery<InventoryMovementDocument> = {};
    if (options.productId && Types.ObjectId.isValid(options.productId)) {
      filter.productId = new Types.ObjectId(options.productId);
    }
    if (options.variantId && Types.ObjectId.isValid(options.variantId)) {
      filter.variantId = new Types.ObjectId(options.variantId);
    }
    if (options.sku) {
      filter.sku = options.sku.toUpperCase();
    }
    if (options.movementType) {
      filter.movementType = options.movementType;
    }
    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) filter.timestamp.$lte = new Date(options.endDate);
    }

    const page = options.page || INVENTORY_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      options.limit || INVENTORY_CONSTANTS.DEFAULT_LIMIT,
      INVENTORY_CONSTANTS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('operatorId', 'firstName lastName email'),
      InventoryMovement.countDocuments(filter),
    ]);

    return { movements, total };
  }

  /**
   * Low-Stock Notification deduplication check.
   */
  public async hasRecentLowStockAlert(_productId: string, sku: string): Promise<boolean> {
    const windowStart = new Date(
      Date.now() - INVENTORY_CONSTANTS.ALERT_DEDUPLICATION_WINDOW_HOURS * 60 * 60 * 1000
    );

    const existingAlert = await Notification.findOne({
      type: NotificationType.LOW_STOCK,
      message: new RegExp(sku, 'i'),
      createdAt: { $gte: windowStart },
    });

    return !!existingAlert;
  }

  /**
   * Record low stock notification.
   */
  public async createLowStockAlert(adminId: string, title: string, message: string): Promise<void> {
    if (!Types.ObjectId.isValid(adminId)) return;

    await notificationService
      .notify({
        eventType: NotificationType.LOW_STOCK,
        recipientId: adminId,
        title,
        message,
        actionUrl: '/admin/inventory',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
      .catch(() => {});
  }

  /**
   * Query inventory items across products and variants with filtering, status calculation, and pagination.
   */
  public async findInventoryItems(options: InventoryQueryOptions): Promise<{
    items: InventoryItemDto[];
    total: number;
  }> {
    const filter: FilterQuery<ProductDocument> = {};

    if (options.categoryId && Types.ObjectId.isValid(options.categoryId)) {
      filter.categoryId = new Types.ObjectId(options.categoryId);
    }

    if (options.sku) {
      const normalizedSku = options.sku.toUpperCase();
      filter.$or = [{ sku: normalizedSku }, { 'variants.sku': normalizedSku }];
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { sku: searchRegex },
        { 'variants.sku': searchRegex },
        { 'variants.title': searchRegex },
      ];
    }

    const products = await Product.find(filter).sort({ updatedAt: -1 });

    const allItems: InventoryItemDto[] = [];

    for (const product of products) {
      if (product.hasVariants && product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const onHand = variant.stockQuantity ?? 0;
          const reserved =
            (variant as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
          const threshold =
            (variant as unknown as { lowStockThreshold?: number }).lowStockThreshold ??
            product.lowStockThreshold ??
            INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
          const tracked =
            (variant as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;
          const available = Math.max(0, onHand - reserved);
          const status = calculateInventoryStatus(tracked, available, threshold);
          const variantId = (variant as unknown as { _id: Types.ObjectId })._id.toString();

          allItems.push({
            id: variantId,
            productId: product._id.toString(),
            variantId,
            productTitle: product.title,
            variantTitle: variant.title,
            sku: variant.sku,
            onHandQuantity: onHand,
            reservedQuantity: reserved,
            availableQuantity: available,
            lowStockThreshold: threshold,
            status,
            isInventoryTracked: tracked,
            updatedAt: product.updatedAt
              ? product.updatedAt.toISOString()
              : new Date().toISOString(),
          });
        }
      } else {
        const onHand = product.stockQuantity ?? 0;
        const reserved =
          (product as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
        const threshold =
          product.lowStockThreshold ?? INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
        const tracked =
          (product as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;
        const available = Math.max(0, onHand - reserved);
        const status = calculateInventoryStatus(tracked, available, threshold);

        allItems.push({
          id: product._id.toString(),
          productId: product._id.toString(),
          productTitle: product.title,
          sku: product.sku,
          onHandQuantity: onHand,
          reservedQuantity: reserved,
          availableQuantity: available,
          lowStockThreshold: threshold,
          status,
          isInventoryTracked: tracked,
          updatedAt: product.updatedAt ? product.updatedAt.toISOString() : new Date().toISOString(),
        });
      }
    }

    // Apply item-level filters
    let filteredItems = allItems;

    if (options.sku) {
      const normalizedSku = options.sku.toUpperCase();
      filteredItems = filteredItems.filter((i) => i.sku.toUpperCase() === normalizedSku);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          i.productTitle.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.variantTitle && i.variantTitle.toLowerCase().includes(q))
      );
    }

    if (options.lowStockOnly) {
      filteredItems = filteredItems.filter((i) => i.status === InventoryStatus.LOW_STOCK);
    } else if (options.outOfStockOnly) {
      filteredItems = filteredItems.filter((i) => i.status === InventoryStatus.OUT_OF_STOCK);
    } else if (options.status) {
      filteredItems = filteredItems.filter((i) => i.status === options.status);
    }

    const total = filteredItems.length;
    const page = options.page || INVENTORY_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      options.limit || INVENTORY_CONSTANTS.DEFAULT_LIMIT,
      INVENTORY_CONSTANTS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    return { items: paginatedItems, total };
  }

  /**
   * Aggregates global inventory metrics across all products and variants.
   */
  public async getInventorySummary(): Promise<InventorySummaryDto> {
    const products = await Product.find(
      {},
      'title sku hasVariants variants stockQuantity reservedQuantity lowStockThreshold isInventoryTracked'
    );

    let totalOnHandQuantity = 0;
    let totalReservedQuantity = 0;
    let totalAvailableQuantity = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let untrackedCount = 0;
    let totalItems = 0;

    for (const product of products) {
      if (product.hasVariants && product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          totalItems += 1;
          const onHand = variant.stockQuantity ?? 0;
          const reserved =
            (variant as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
          const threshold =
            (variant as unknown as { lowStockThreshold?: number }).lowStockThreshold ??
            product.lowStockThreshold ??
            INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
          const tracked =
            (variant as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;
          const available = Math.max(0, onHand - reserved);
          const status = calculateInventoryStatus(tracked, available, threshold);

          totalOnHandQuantity += onHand;
          totalReservedQuantity += reserved;
          totalAvailableQuantity += available;

          if (status === InventoryStatus.IN_STOCK) inStockCount += 1;
          else if (status === InventoryStatus.LOW_STOCK) lowStockCount += 1;
          else if (status === InventoryStatus.OUT_OF_STOCK) outOfStockCount += 1;
          else if (status === InventoryStatus.UNTRACKED) untrackedCount += 1;
        }
      } else {
        totalItems += 1;
        const onHand = product.stockQuantity ?? 0;
        const reserved =
          (product as unknown as { reservedQuantity?: number }).reservedQuantity ?? 0;
        const threshold =
          product.lowStockThreshold ?? INVENTORY_CONSTANTS.DEFAULT_LOW_STOCK_THRESHOLD;
        const tracked =
          (product as unknown as { isInventoryTracked?: boolean }).isInventoryTracked ?? true;
        const available = Math.max(0, onHand - reserved);
        const status = calculateInventoryStatus(tracked, available, threshold);

        totalOnHandQuantity += onHand;
        totalReservedQuantity += reserved;
        totalAvailableQuantity += available;

        if (status === InventoryStatus.IN_STOCK) inStockCount += 1;
        else if (status === InventoryStatus.LOW_STOCK) lowStockCount += 1;
        else if (status === InventoryStatus.OUT_OF_STOCK) outOfStockCount += 1;
        else if (status === InventoryStatus.UNTRACKED) untrackedCount += 1;
      }
    }

    return {
      totalItems,
      totalOnHandQuantity,
      totalReservedQuantity,
      totalAvailableQuantity,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      untrackedCount,
    };
  }
}

export function calculateInventoryStatus(
  isInventoryTracked: boolean,
  availableQuantity: number,
  lowStockThreshold: number
): InventoryStatus {
  if (!isInventoryTracked) {
    return InventoryStatus.UNTRACKED;
  }
  if (availableQuantity <= 0) {
    return InventoryStatus.OUT_OF_STOCK;
  }
  if (availableQuantity <= lowStockThreshold) {
    return InventoryStatus.LOW_STOCK;
  }
  return InventoryStatus.IN_STOCK;
}

export const inventoryRepository = new InventoryRepository();
