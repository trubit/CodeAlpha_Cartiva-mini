import crypto from 'crypto';
import { Types } from 'mongoose';
import { InventoryMovementType, ReservationStatus, UserRole } from '@shared/enums.js';
import type {
  InventoryItemDto,
  InventorySummaryDto,
  InventoryMovementDto,
  InventoryReservationDto,
  InitializeInventoryDto,
  ReceiveStockDto,
  DeductStockDto,
  AdjustStockDto,
  UpdateThresholdDto,
  CreateReservationDto,
  PaginatedInventoryDto,
  PaginatedMovementsDto,
} from '@shared/api.types.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { inventoryRepository, calculateInventoryStatus } from './inventory.repository.js';
import { INVENTORY_CONSTANTS } from './inventory.constants.js';
import type { InventoryQueryOptions, MovementQueryOptions } from './inventory.types.js';
import { InventoryMovement } from '../../models/InventoryMovement.model.js';
import { InventoryReservation } from '../../models/InventoryReservation.model.js';
import { User } from '../../models/User.model.js';

export class InventoryService {
  /**
   * Retrieves paginated inventory overview with status calculation.
   */
  public async getInventoryList(query: InventoryQueryOptions): Promise<PaginatedInventoryDto> {
    const page = query.page || INVENTORY_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit || INVENTORY_CONSTANTS.DEFAULT_LIMIT,
      INVENTORY_CONSTANTS.MAX_LIMIT
    );

    const { items, total } = await inventoryRepository.findInventoryItems(query);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves low-stock inventory items.
   */
  public async getLowStockItems(query: InventoryQueryOptions): Promise<PaginatedInventoryDto> {
    return this.getInventoryList({ ...query, lowStockOnly: true });
  }

  /**
   * Retrieves out-of-stock inventory items.
   */
  public async getOutOfStockItems(query: InventoryQueryOptions): Promise<PaginatedInventoryDto> {
    return this.getInventoryList({ ...query, outOfStockOnly: true });
  }

  /**
   * Global inventory summary.
   */
  public async getInventorySummary(): Promise<InventorySummaryDto> {
    return inventoryRepository.getInventorySummary();
  }

  /**
   * Retrieves detail for a specific inventory target (product or variant).
   */
  public async getInventoryDetail(
    inventoryId: string,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError(
        'Inventory record not found for specified identifier.',
        404,
        ErrorCodes.INVENTORY_NOT_FOUND
      );
    }

    const status = calculateInventoryStatus(
      target.isInventoryTracked,
      target.availableQuantity,
      target.lowStockThreshold
    );

    return {
      id: target.variantId || target.product._id.toString(),
      productId: target.product._id.toString(),
      variantId: target.variantId,
      productTitle: target.product.title,
      variantTitle: target.variantTitle,
      sku: target.sku,
      onHandQuantity: target.onHandQuantity,
      reservedQuantity: target.reservedQuantity,
      availableQuantity: target.availableQuantity,
      lowStockThreshold: target.lowStockThreshold,
      status,
      isInventoryTracked: target.isInventoryTracked,
      updatedAt: target.product.updatedAt
        ? target.product.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  /**
   * Retrieves movement history for a target or system-wide.
   */
  public async getMovements(
    inventoryId: string | undefined,
    query: MovementQueryOptions
  ): Promise<PaginatedMovementsDto> {
    const options: MovementQueryOptions = { ...query };

    if (inventoryId) {
      const target = await inventoryRepository.resolveTarget(inventoryId, query.variantId);
      if (!target) {
        throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
      }
      options.productId = target.product._id.toString();
      if (target.variantId) {
        options.variantId = target.variantId;
      }
      options.sku = target.sku;
    }

    const page = options.page || INVENTORY_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      options.limit || INVENTORY_CONSTANTS.DEFAULT_LIMIT,
      INVENTORY_CONSTANTS.MAX_LIMIT
    );

    const { movements, total } = await inventoryRepository.findMovements(options);

    const movementDtos: InventoryMovementDto[] = movements.map((m) => {
      const op = m.operatorId as unknown as
        { firstName?: string; lastName?: string; email?: string } | undefined;
      const operatorName = op
        ? `${op.firstName || ''} ${op.lastName || ''}`.trim() || op.email
        : undefined;

      return {
        id: m._id.toString(),
        productId: m.productId.toString(),
        variantId: m.variantId ? m.variantId.toString() : undefined,
        sku: m.sku,
        movementType: m.movementType as InventoryMovementType,
        quantity: m.quantity,
        previousStock: m.previousStock,
        newStock: m.newStock,
        reason: m.reason,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        operatorId: m.operatorId ? m.operatorId.toString() : undefined,
        operatorName,
        timestamp: m.timestamp.toISOString(),
      };
    });

    return {
      movements: movementDtos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Initial stock setup.
   */
  public async initializeStock(
    adminId: string,
    inventoryId: string,
    dto: InitializeInventoryDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
    }

    // Prevent duplicate initialization
    const existingMovement = await InventoryMovement.findOne({
      sku: target.sku,
      movementType: InventoryMovementType.INITIAL_STOCK,
    });
    if (existingMovement) {
      throw new AppError(
        `Stock for SKU ${target.sku} has already been initialized. Use adjust or receive instead.`,
        400,
        ErrorCodes.ALREADY_INITIALIZED
      );
    }

    if (dto.lowStockThreshold !== undefined) {
      await inventoryRepository.updateThreshold(
        target.product._id.toString(),
        target.variantId,
        dto.lowStockThreshold
      );
    }

    const previousStock = target.onHandQuantity;
    await inventoryRepository.setStockQuantity(
      target.product._id.toString(),
      target.variantId,
      dto.quantity
    );

    // Record initial stock movement
    await inventoryRepository.recordMovement({
      productId: target.product._id.toString(),
      variantId: target.variantId,
      sku: target.sku,
      movementType: InventoryMovementType.INITIAL_STOCK,
      quantity: dto.quantity - previousStock,
      previousStock,
      newStock: dto.quantity,
      reason: dto.reason || 'Initial stock setup',
      referenceType: 'manual',
      operatorId: adminId,
    });

    return this.getInventoryDetail(target.product._id.toString(), target.variantId);
  }

  /**
   * Receive newly arrived stock (atomic increment).
   */
  public async receiveStock(
    adminId: string,
    inventoryId: string,
    dto: ReceiveStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
    }

    const result = await inventoryRepository.atomicIncrementStock(
      target.product._id.toString(),
      target.variantId,
      dto.quantity
    );

    if (!result) {
      throw new AppError(
        'Failed to receive stock atomically.',
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR
      );
    }

    await inventoryRepository.recordMovement({
      productId: target.product._id.toString(),
      variantId: target.variantId,
      sku: target.sku,
      movementType: InventoryMovementType.RESTOCK,
      quantity: dto.quantity,
      previousStock: result.previousStock,
      newStock: result.newStock,
      reason: dto.reason,
      referenceType: dto.referenceId ? 'purchase_order' : 'manual',
      referenceId: dto.referenceId,
      operatorId: adminId,
    });

    return this.getInventoryDetail(target.product._id.toString(), target.variantId);
  }

  /**
   * Deduct stock for operational reasons (damage, loss, corrections).
   */
  public async deductStock(
    adminId: string,
    inventoryId: string,
    dto: DeductStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
    }

    if (target.availableQuantity < dto.quantity) {
      throw new AppError(
        `Insufficient available stock (${target.availableQuantity}) for deduction of ${dto.quantity} units.`,
        400,
        ErrorCodes.INSUFFICIENT_STOCK
      );
    }

    const result = await inventoryRepository.atomicDecrementStock(
      target.product._id.toString(),
      target.variantId,
      dto.quantity
    );

    if (!result) {
      throw new AppError(
        'Cannot deduct stock. Available stock was insufficient during atomic update.',
        400,
        ErrorCodes.INSUFFICIENT_STOCK
      );
    }

    const movementType = dto.movementType || InventoryMovementType.DAMAGED_STOCK;

    await inventoryRepository.recordMovement({
      productId: target.product._id.toString(),
      variantId: target.variantId,
      sku: target.sku,
      movementType,
      quantity: -dto.quantity,
      previousStock: result.previousStock,
      newStock: result.newStock,
      reason: dto.reason,
      referenceType: 'manual',
      referenceId: dto.referenceId,
      operatorId: adminId,
    });

    // Check low stock condition
    const newAvailable = Math.max(0, result.newStock - target.reservedQuantity);
    if (newAvailable <= target.lowStockThreshold) {
      await this.triggerLowStockAlertIfNeeded(
        adminId,
        target.product._id.toString(),
        target.sku,
        target.product.title,
        newAvailable,
        target.lowStockThreshold
      );
    }

    return this.getInventoryDetail(target.product._id.toString(), target.variantId);
  }

  /**
   * Manual stock adjustment to target quantity.
   */
  public async adjustStock(
    adminId: string,
    inventoryId: string,
    dto: AdjustStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
    }

    if (dto.targetQuantity < target.reservedQuantity) {
      throw new AppError(
        `Target quantity (${dto.targetQuantity}) cannot be lower than existing reserved stock (${target.reservedQuantity}).`,
        400,
        ErrorCodes.NEGATIVE_STOCK_DISALLOWED
      );
    }

    const result = await inventoryRepository.setStockQuantity(
      target.product._id.toString(),
      target.variantId,
      dto.targetQuantity
    );

    if (!result) {
      throw new AppError('Failed to set stock quantity.', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    const diff = dto.targetQuantity - result.previousStock;

    await inventoryRepository.recordMovement({
      productId: target.product._id.toString(),
      variantId: target.variantId,
      sku: target.sku,
      movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
      quantity: diff,
      previousStock: result.previousStock,
      newStock: dto.targetQuantity,
      reason: dto.reason,
      referenceType: 'manual',
      referenceId: dto.referenceId,
      operatorId: adminId,
    });

    const newAvailable = Math.max(0, dto.targetQuantity - target.reservedQuantity);
    if (newAvailable <= target.lowStockThreshold) {
      await this.triggerLowStockAlertIfNeeded(
        adminId,
        target.product._id.toString(),
        target.sku,
        target.product.title,
        newAvailable,
        target.lowStockThreshold
      );
    }

    return this.getInventoryDetail(target.product._id.toString(), target.variantId);
  }

  /**
   * Update low-stock threshold.
   */
  public async updateThreshold(
    _adminId: string,
    inventoryId: string,
    dto: UpdateThresholdDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const target = await inventoryRepository.resolveTarget(inventoryId, variantId);
    if (!target) {
      throw new AppError('Inventory target not found.', 404, ErrorCodes.INVENTORY_NOT_FOUND);
    }

    await inventoryRepository.updateThreshold(
      target.product._id.toString(),
      target.variantId,
      dto.lowStockThreshold
    );

    return this.getInventoryDetail(target.product._id.toString(), target.variantId);
  }

  /**
   * Stock Reservation Foundation: Atomically reserves stock for items.
   * Fully idempotent using idempotencyKey.
   */
  public async createReservation(
    data: CreateReservationDto & { userId?: string; sessionId?: string }
  ): Promise<InventoryReservationDto> {
    // 1. Check idempotency
    if (data.idempotencyKey) {
      const existing = await inventoryRepository.findReservationByIdempotencyKey(
        data.idempotencyKey
      );
      if (existing) {
        return this.mapReservationToDto(existing);
      }
    }

    // 2. Validate availability for all items before reservation
    const targets: Array<{
      productId: string;
      variantId?: string;
      sku: string;
      quantity: number;
    }> = [];

    for (const item of data.items) {
      const target = await inventoryRepository.resolveTarget(item.productId, item.variantId);
      if (!target) {
        throw new AppError(
          `Product or variant not found for item with SKU: ${item.sku}`,
          404,
          ErrorCodes.INVENTORY_NOT_FOUND
        );
      }

      if (target.availableQuantity < item.quantity) {
        throw new AppError(
          `Insufficient available stock for SKU: ${item.sku}. Requested: ${item.quantity}, Available: ${target.availableQuantity}`,
          400,
          ErrorCodes.INSUFFICIENT_STOCK
        );
      }

      targets.push({
        productId: target.product._id.toString(),
        variantId: target.variantId,
        sku: target.sku,
        quantity: item.quantity,
      });
    }

    // 3. Atomically reserve each item with compensating rollback on failure
    const reservedItems: typeof targets = [];

    for (const item of targets) {
      const success = await inventoryRepository.atomicReserveItem(
        item.productId,
        item.variantId,
        item.quantity
      );

      if (!success) {
        // Rollback previously reserved items
        for (const rolledBackItem of reservedItems) {
          await inventoryRepository.atomicReleaseItem(
            rolledBackItem.productId,
            rolledBackItem.variantId,
            rolledBackItem.quantity
          );
        }
        throw new AppError(
          `Failed to reserve stock for SKU: ${item.sku}. Race condition or insufficient remaining available stock.`,
          400,
          ErrorCodes.INSUFFICIENT_STOCK
        );
      }

      reservedItems.push(item);
    }

    // 4. Create reservation record
    const reservationId = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ttlMinutes = data.expiresInMinutes || INVENTORY_CONSTANTS.DEFAULT_RESERVATION_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const reservation = await inventoryRepository.createReservation({
      reservationId,
      userId: data.userId,
      sessionId: data.sessionId,
      items: reservedItems,
      status: ReservationStatus.PENDING,
      expiresAt,
      idempotencyKey: data.idempotencyKey,
      referenceType: data.referenceType || 'cart',
      referenceId: data.referenceId,
    });

    return this.mapReservationToDto(reservation);
  }

  /**
   * Retrieves reservation by ID, auto-releasing if expired.
   */
  public async getReservation(reservationId: string): Promise<InventoryReservationDto> {
    const reservation = await inventoryRepository.findReservationById(reservationId);
    if (!reservation) {
      throw new AppError('Reservation not found.', 404, ErrorCodes.RESERVATION_NOT_FOUND);
    }

    // Auto-expire handling
    if (reservation.status === ReservationStatus.PENDING && reservation.expiresAt < new Date()) {
      await this.releaseReservation(reservationId, 'Auto-expired past TTL');
      const expiredDoc = await inventoryRepository.updateReservationStatus(
        reservationId,
        ReservationStatus.EXPIRED
      );
      return this.mapReservationToDto(expiredDoc || reservation);
    }

    return this.mapReservationToDto(reservation);
  }

  /**
   * Releases an existing reservation back into available stock.
   */
  public async releaseReservation(
    reservationId: string,
    _reason?: string
  ): Promise<InventoryReservationDto> {
    // Atomically transition status from PENDING to RELEASED
    const updated = await InventoryReservation.findOneAndUpdate(
      { reservationId, status: ReservationStatus.PENDING },
      { $set: { status: ReservationStatus.RELEASED, releasedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      const existing = await inventoryRepository.findReservationById(reservationId);
      if (!existing) {
        throw new AppError('Reservation not found.', 404, ErrorCodes.RESERVATION_NOT_FOUND);
      }
      if (existing.status === ReservationStatus.RELEASED) {
        throw new AppError(
          'Reservation has already been released.',
          400,
          ErrorCodes.RESERVATION_ALREADY_RELEASED
        );
      }
      if (existing.status === ReservationStatus.CONFIRMED) {
        throw new AppError(
          'Reservation has already been confirmed and cannot be released.',
          400,
          ErrorCodes.RESERVATION_ALREADY_CONFIRMED
        );
      }
      return this.mapReservationToDto(existing);
    }

    // Since this process uniquely acquired the transition, release the reserved holds
    for (const item of updated.items) {
      await inventoryRepository.atomicReleaseItem(
        item.productId.toString(),
        item.variantId ? item.variantId.toString() : undefined,
        item.quantity
      );
    }

    return this.mapReservationToDto(updated);
  }

  /**
   * Confirm reservation into an order (deducts on-hand stock and releases reservation hold).
   */
  public async confirmReservation(
    reservationId: string,
    referenceId?: string
  ): Promise<InventoryReservationDto> {
    // Atomically transition status from PENDING to CONFIRMED
    const updated = await InventoryReservation.findOneAndUpdate(
      { reservationId, status: ReservationStatus.PENDING },
      { $set: { status: ReservationStatus.CONFIRMED, confirmedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      const existing = await inventoryRepository.findReservationById(reservationId);
      if (!existing) {
        throw new AppError('Reservation not found.', 404, ErrorCodes.RESERVATION_NOT_FOUND);
      }
      if (existing.status === ReservationStatus.CONFIRMED) {
        throw new AppError(
          'Reservation has already been confirmed.',
          400,
          ErrorCodes.RESERVATION_ALREADY_CONFIRMED
        );
      }
      throw new AppError(
        `Cannot confirm reservation in '${existing.status}' status.`,
        400,
        ErrorCodes.BAD_REQUEST
      );
    }

    // Since this process uniquely acquired confirmation, deduct physical stock and clear hold
    for (const item of updated.items) {
      const prodId = item.productId.toString();
      const varId = item.variantId ? item.variantId.toString() : undefined;

      // Atomically decrement on-hand stock and decrement reserved hold
      const decResult = await inventoryRepository.atomicDecrementStock(
        prodId,
        varId,
        item.quantity
      );
      await inventoryRepository.atomicReleaseItem(prodId, varId, item.quantity);

      // Record movement as purchase deduction
      await inventoryRepository.recordMovement({
        productId: prodId,
        variantId: varId,
        sku: item.sku,
        movementType: InventoryMovementType.PURCHASE_DEDUCTION,
        quantity: -item.quantity,
        previousStock: decResult ? decResult.previousStock : item.quantity,
        newStock: decResult ? decResult.newStock : 0,
        reason: 'Order confirmation deduction',
        referenceType: 'order',
        referenceId: referenceId || reservationId,
      });
    }

    return this.mapReservationToDto(updated);
  }

  /**
   * Internal helper: Triggers low-stock alert with deduplication.
   */
  private async triggerLowStockAlertIfNeeded(
    actorId: string,
    productId: string,
    sku: string,
    productTitle: string,
    currentAvailable: number,
    threshold: number
  ): Promise<void> {
    const hasRecentAlert = await inventoryRepository.hasRecentLowStockAlert(productId, sku);
    if (hasRecentAlert) {
      return;
    }

    let recipientId = actorId;
    if (!Types.ObjectId.isValid(actorId)) {
      const admin = await User.findOne({ role: UserRole.ADMIN, isActive: true });
      if (admin) recipientId = admin._id.toString();
    }

    const title = `Low Stock Alert: ${sku}`;
    const message = `Product "${productTitle}" (SKU: ${sku}) is running low on stock. Current available: ${currentAvailable}, Threshold: ${threshold}.`;

    await inventoryRepository.createLowStockAlert(recipientId, title, message);
  }

  private mapReservationToDto(
    reservation: import('../../models/InventoryReservation.model.js').InventoryReservationDocument
  ): InventoryReservationDto {
    return {
      id: reservation._id.toString(),
      reservationId: reservation.reservationId,
      userId: reservation.userId ? reservation.userId.toString() : undefined,
      sessionId: reservation.sessionId,
      items: reservation.items.map((i) => ({
        productId: i.productId.toString(),
        variantId: i.variantId ? i.variantId.toString() : undefined,
        sku: i.sku,
        quantity: i.quantity,
      })),
      status: reservation.status as ReservationStatus,
      expiresAt: reservation.expiresAt.toISOString(),
      idempotencyKey: reservation.idempotencyKey,
      referenceType: reservation.referenceType,
      referenceId: reservation.referenceId,
      createdAt:
        (reservation as unknown as { createdAt?: Date }).createdAt?.toISOString() ||
        new Date().toISOString(),
      updatedAt:
        (reservation as unknown as { updatedAt?: Date }).updatedAt?.toISOString() ||
        new Date().toISOString(),
    };
  }
}

export const inventoryService = new InventoryService();
