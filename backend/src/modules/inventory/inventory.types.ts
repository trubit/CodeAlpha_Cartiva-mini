import { InventoryStatus, InventoryMovementType } from '@shared/enums.js';

export interface InventoryQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sku?: string;
  status?: InventoryStatus;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  categoryId?: string;
}

export interface MovementQueryOptions {
  page?: number;
  limit?: number;
  productId?: string;
  variantId?: string;
  sku?: string;
  movementType?: InventoryMovementType;
  startDate?: Date;
  endDate?: Date;
}

export interface InventoryTarget {
  productId: string;
  variantId?: string;
  sku: string;
}

export interface AtomicStockUpdateResult {
  productId: string;
  variantId?: string;
  sku: string;
  previousStock: number;
  newStock: number;
  previousReserved: number;
  newReserved: number;
  availableStock: number;
  lowStockThreshold: number;
  isInventoryTracked: boolean;
}
