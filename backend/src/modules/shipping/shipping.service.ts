import { Types } from 'mongoose';
import { ShippingCalculationType } from '@shared/enums.js';
import type {
  ShippingMethodDto,
  ShippingQuoteRequestDto,
  ShippingQuoteItemDto,
  ShippingQuoteResponseDto,
  ShippingAvailabilityDto,
  CreateShippingConfigDto,
  UpdateShippingConfigDto,
  ShippingConfigFilterDto,
} from '@shared/api.types.js';
import { AppError } from '../../utils/AppError.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { SHIPPING_CONSTANTS } from './shipping.constants.js';
import { shippingRepository } from './shipping.repository.js';
import { normalizeNigerianLocation } from './location-normalizer.js';
import { ShippingConfiguration } from '../../models/ShippingConfiguration.model.js';
import { Address } from '../../models/Address.model.js';
import { Product } from '../../models/Product.model.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import { cartRepository } from '../cart/cart.repository.js';
import type { ShippingConfigurationDocument } from '../../models/ShippingConfiguration.model.js';

export interface ShippingContext {
  userId?: string;
  guestToken?: string;
  userRole?: string;
}

export class ShippingService {
  /**
   * Converts a ShippingConfiguration document into a public ShippingMethodDto.
   */
  public toMethodDto(config: ShippingConfigurationDocument): ShippingMethodDto {
    const minDays = config.estimatedDeliveryDaysMin;
    const maxDays = config.estimatedDeliveryDaysMax;
    const estimatedDeliveryText =
      minDays === maxDays
        ? `${minDays} business day${minDays > 1 ? 's' : ''}`
        : `${minDays}–${maxDays} business days`;

    return {
      id: config._id.toString(),
      zoneName: config.zoneName,
      methodName: config.methodName || 'Standard Delivery',
      carrierName: config.carrierName,
      description: config.description,
      rateCalculationType: config.rateCalculationType,
      baseRate: config.baseRate,
      ratePerAdditionalKg: config.ratePerAdditionalKg || 0,
      freeShippingThreshold: config.freeShippingThreshold,
      estimatedDeliveryDaysMin: minDays,
      estimatedDeliveryDaysMax: maxDays,
      estimatedDeliveryText,
      countriesCovered: config.countriesCovered || [SHIPPING_CONSTANTS.DEFAULT_COUNTRY],
      statesCovered: config.statesCovered,
      currency: config.currency || SHIPPING_CONSTANTS.DEFAULT_CURRENCY,
      isActive: config.isActive,
    };
  }

  /**
   * Retrieves active shipping methods available for a destination country and state.
   */
  public async getAvailableMethods(
    country: string = SHIPPING_CONSTANTS.DEFAULT_COUNTRY,
    state: string
  ): Promise<ShippingMethodDto[]> {
    if (!state || !state.trim()) {
      throw AppError.badRequest('Destination state is required.', ErrorCodes.VALIDATION_ERROR);
    }

    const normalized = normalizeNigerianLocation(state, undefined, undefined, country);
    const configs = await shippingRepository.findActiveConfigsForLocation(country, normalized.state);
    return configs.map((c) => this.toMethodDto(c));
  }

  /**
   * Checks whether delivery service is available to a given location.
   */
  public async checkAvailability(
    country: string = SHIPPING_CONSTANTS.DEFAULT_COUNTRY,
    state: string
  ): Promise<ShippingAvailabilityDto> {
    if (!state || !state.trim()) {
      throw AppError.badRequest('Destination state is required.', ErrorCodes.VALIDATION_ERROR);
    }

    const normalized = normalizeNigerianLocation(state, undefined, undefined, country);

    // If destination is in Nigeria and state is unrecognized, reject delivery availability
    if (
      country.toLowerCase() === 'nigeria' &&
      !normalized.isRecognizedState &&
      state.trim() !== '*' &&
      state.toLowerCase() !== 'all'
    ) {
      return {
        isAvailable: false,
        destination: { country, state },
        supportedMethodsCount: 0,
        availableMethods: [],
        message: `State '${state}' is not recognized as a valid Nigerian state or delivery territory. Please verify your address.`,
      };
    }

    const configs = await shippingRepository.findActiveConfigsForLocation(country, normalized.state);
    const isAvailable = configs.length > 0;

    const availableMethods = configs.map((c) => {
      const minDays = c.estimatedDeliveryDaysMin;
      const maxDays = c.estimatedDeliveryDaysMax;
      const estimatedDeliveryText =
        minDays === maxDays
          ? `${minDays} business day${minDays > 1 ? 's' : ''}`
          : `${minDays}–${maxDays} business days`;

      return {
        id: c._id.toString(),
        methodName: c.methodName || 'Standard Delivery',
        carrierName: c.carrierName,
        estimatedDeliveryText,
        baseRate: c.baseRate,
        currency: c.currency || SHIPPING_CONSTANTS.DEFAULT_CURRENCY,
      };
    });

    let message: string;
    if (isAvailable) {
      message = `We deliver to ${normalized.state}, ${country} via ${configs.length} available shipping option${
        configs.length > 1 ? 's' : ''
      }.`;
    } else {
      const anyActiveConfig = await ShippingConfiguration.findOne({ isActive: true });
      if (!anyActiveConfig) {
        message = 'Shipping configurations are currently being updated by platform administration. Please contact support.';
      } else if (!normalized.isRecognizedState) {
        message = `State '${state}' is not recognized as a valid Nigerian state or delivery territory. Please verify your address.`;
      } else {
        message = `Delivery is currently not available to ${normalized.state}, ${country}. Please contact support for assistance.`;
      }
    }

    return {
      isAvailable,
      destination: { country, state: normalized.state },
      supportedMethodsCount: configs.length,
      availableMethods,
      message,
    };
  }

  /**
   * Calculates the authoritative shipping quotes for a customer's cart and delivery destination.
   * Strict minor units financial math, server-side address ownership validation, and real inventory weights.
   */
  public async calculateAuthoritativeQuote(
    context: ShippingContext,
    request: ShippingQuoteRequestDto
  ): Promise<ShippingQuoteResponseDto> {
    let resolvedCountry = SHIPPING_CONSTANTS.DEFAULT_COUNTRY;
    let resolvedState = '';
    let resolvedCity: string | undefined;

    // 1. Resolve Delivery Destination
    if (request.addressId) {
      if (!Types.ObjectId.isValid(request.addressId)) {
        throw AppError.badRequest('Invalid address identifier.', ErrorCodes.VALIDATION_ERROR);
      }

      const address = await Address.findById(request.addressId);
      if (!address) {
        throw AppError.notFound('Delivery address not found.', ErrorCodes.ADDRESS_NOT_FOUND);
      }

      // Enforce strict address ownership if user is authenticated
      if (context.userId && address.userId.toString() !== context.userId) {
        throw AppError.forbidden(
          'Access to this delivery address was denied.',
          ErrorCodes.ADDRESS_ACCESS_DENIED
        );
      }

      const normalized = normalizeNigerianLocation(
        address.state,
        address.city,
        address.streetAddress,
        address.country
      );

      resolvedCountry = normalized.country;
      resolvedState = normalized.state;
      resolvedCity = normalized.city;
    } else if (request.destination && request.destination.state) {
      const normalized = normalizeNigerianLocation(
        request.destination.state,
        request.destination.city,
        undefined,
        request.destination.country
      );
      resolvedCountry = normalized.country;
      resolvedState = normalized.state;
      resolvedCity = normalized.city;
    } else {
      throw AppError.badRequest(
        'Either a saved address ID or a destination state must be provided.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 2. Fetch authoritative cart subtotal & total weight
    let subtotalMinor = 0;
    let currency = SHIPPING_CONSTANTS.DEFAULT_CURRENCY;
    let totalWeightKg = 0;

    const guestToken = request.guestToken || context.guestToken;
    let cart = null;

    if (context.userId) {
      cart = await cartRepository.findCartByUserId(context.userId);
    } else if (guestToken) {
      cart = await cartRepository.findCartBySessionId(guestToken);
    }

    if (cart && cart.items && cart.items.length > 0) {
      currency = cart.currency || SHIPPING_CONSTANTS.DEFAULT_CURRENCY;

      // Extract product IDs to query authoritative weights & verify active prices
      const productIds = cart.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      for (const item of cart.items) {
        const product = productMap.get(item.productId.toString());
        if (!product) continue;

        // Authoritative item price in minor units
        let itemPrice = product.regularPrice;
        if (item.variantId && product.variants?.length) {
          const variant = product.variants.find(
            (v) => v._id?.toString() === item.variantId?.toString()
          );
          if (variant) itemPrice = variant.price;
        } else {
          const now = new Date();
          const isSale =
            product.salePrice !== undefined &&
            product.salePrice !== null &&
            product.salePrice > 0 &&
            (!product.saleStartDate || product.saleStartDate <= now) &&
            (!product.saleEndDate || product.saleEndDate >= now);
          if (isSale && product.salePrice) itemPrice = product.salePrice;
        }

        const itemPriceMinor = Math.round(itemPrice * 100);
        subtotalMinor += itemPriceMinor * item.quantity;

        // Weight calculation
        const itemWeightKg =
          product.weightGrams && product.weightGrams > 0
            ? product.weightGrams / 1000
            : SHIPPING_CONSTANTS.DEFAULT_ITEM_WEIGHT_KG;

        totalWeightKg += itemWeightKg * item.quantity;
      }
    } else {
      // If cart is empty or estimating beforehand, default weight to 1.0 kg
      totalWeightKg = 1.0;
    }

    const subtotal = subtotalMinor / 100;

    // 3. Find matching active shipping configurations
    const configs = await shippingRepository.findActiveConfigsForLocation(
      resolvedCountry,
      resolvedState
    );

    if (configs.length === 0) {
      return {
        destination: {
          country: resolvedCountry,
          state: resolvedState,
          city: resolvedCity,
        },
        quotes: [],
        subtotal,
        subtotalMinor,
        currency,
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        isDeliverable: false,
        message: `We currently do not offer delivery to ${resolvedState}, ${resolvedCountry}.`,
      };
    }

    // 4. Calculate quotes for each available configuration
    const quotes: ShippingQuoteItemDto[] = [];

    for (const config of configs) {
      if (request.shippingMethodId && config._id.toString() !== request.shippingMethodId) {
        continue;
      }

      const baseRateMinor = Math.round(config.baseRate * 100);
      let calculatedFeeMinor = baseRateMinor;
      let isFreeShipping = false;
      const qualifiesForFreeShipping =
        config.freeShippingThreshold !== undefined &&
        config.freeShippingThreshold !== null &&
        config.freeShippingThreshold > 0 &&
        subtotal >= config.freeShippingThreshold;

      if (qualifiesForFreeShipping) {
        calculatedFeeMinor = 0;
        isFreeShipping = true;
      } else if (
        config.rateCalculationType === ShippingCalculationType.WEIGHT_TIERED &&
        totalWeightKg > 1
      ) {
        const additionalKg = Math.ceil(totalWeightKg - 1);
        const ratePerAdditionalKgMinor = Math.round((config.ratePerAdditionalKg || 0) * 100);
        calculatedFeeMinor = baseRateMinor + ratePerAdditionalKgMinor * additionalKg;
      }

      const minDays = config.estimatedDeliveryDaysMin;
      const maxDays = config.estimatedDeliveryDaysMax;
      const estimatedDeliveryText =
        minDays === maxDays
          ? `${minDays} business day${minDays > 1 ? 's' : ''}`
          : `${minDays}–${maxDays} business days`;

      let amountNeededForFreeShipping: number | undefined;
      if (
        config.freeShippingThreshold !== undefined &&
        config.freeShippingThreshold !== null &&
        config.freeShippingThreshold > 0 &&
        subtotal < config.freeShippingThreshold
      ) {
        amountNeededForFreeShipping =
          Math.round((config.freeShippingThreshold - subtotal) * 100) / 100;
      }

      quotes.push({
        methodId: config._id.toString(),
        methodName: config.methodName || 'Standard Delivery',
        carrierName: config.carrierName,
        description: config.description,
        fee: calculatedFeeMinor / 100,
        feeMinor: calculatedFeeMinor,
        currency: config.currency || currency,
        estimatedDaysMin: minDays,
        estimatedDaysMax: maxDays,
        estimatedDeliveryText,
        isFreeShipping,
        qualifiesForFreeShipping,
        amountNeededForFreeShipping,
      });
    }

    return {
      destination: {
        country: resolvedCountry,
        state: resolvedState,
        city: resolvedCity,
      },
      quotes,
      subtotal,
      subtotalMinor,
      currency,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      isDeliverable: quotes.length > 0,
      message:
        quotes.length > 0
          ? `Found ${quotes.length} delivery option${quotes.length > 1 ? 's' : ''}.`
          : 'No shipping methods available for this destination.',
    };
  }

  // ============================================================================
  // Administrator Shipping Configuration Management
  // ============================================================================

  /**
   * Lists all shipping configurations with optional filtering.
   */
  public async listAllConfigurations(
    filters: ShippingConfigFilterDto
  ): Promise<ShippingConfigurationDocument[]> {
    return shippingRepository.findAll(filters);
  }

  /**
   * Retrieves a single shipping configuration by ID.
   */
  public async getConfigurationById(id: string): Promise<ShippingConfigurationDocument> {
    const config = await shippingRepository.findById(id);
    if (!config) {
      throw AppError.notFound(
        'Shipping configuration not found.',
        ErrorCodes.SHIPPING_CONFIG_NOT_FOUND
      );
    }
    return config;
  }

  /**
   * Creates a new shipping configuration with audit logging.
   */
  public async createConfiguration(
    data: CreateShippingConfigDto,
    actorId?: string,
    actorRole?: string
  ): Promise<ShippingConfigurationDocument> {
    const config = await shippingRepository.create(data);

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: actorRole || 'admin',
        action: 'CREATE_SHIPPING_CONFIGURATION',
        entity: 'ShippingConfiguration',
        entityId: config._id,
        changesDiff: { after: data },
        timestamp: new Date(),
      });
    }

    return config;
  }

  /**
   * Updates an existing shipping configuration with audit logging.
   */
  public async updateConfiguration(
    id: string,
    updateData: UpdateShippingConfigDto,
    actorId?: string,
    actorRole?: string
  ): Promise<ShippingConfigurationDocument> {
    const existing = await shippingRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(
        'Shipping configuration not found.',
        ErrorCodes.SHIPPING_CONFIG_NOT_FOUND
      );
    }

    const beforeState = existing.toObject();
    const updated = await shippingRepository.update(id, updateData);
    if (!updated) {
      throw new AppError(
        'Failed to update shipping configuration.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: actorRole || 'admin',
        action: 'UPDATE_SHIPPING_CONFIGURATION',
        entity: 'ShippingConfiguration',
        entityId: updated._id,
        changesDiff: {
          before: beforeState,
          after: updated.toObject(),
        },
        timestamp: new Date(),
      });
    }

    return updated;
  }

  /**
   * Activates or deactivates a shipping configuration.
   */
  public async toggleConfigurationStatus(
    id: string,
    isActive: boolean,
    actorId?: string,
    actorRole?: string
  ): Promise<ShippingConfigurationDocument> {
    return this.updateConfiguration(id, { isActive }, actorId, actorRole);
  }

  /**
   * Deletes a shipping configuration with audit logging.
   */
  public async deleteConfiguration(
    id: string,
    actorId?: string,
    actorRole?: string
  ): Promise<void> {
    const existing = await shippingRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(
        'Shipping configuration not found.',
        ErrorCodes.SHIPPING_CONFIG_NOT_FOUND
      );
    }

    const beforeState = existing.toObject();
    await shippingRepository.delete(id);

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: actorRole || 'admin',
        action: 'DELETE_SHIPPING_CONFIGURATION',
        entity: 'ShippingConfiguration',
        entityId: existing._id,
        changesDiff: { before: beforeState },
        timestamp: new Date(),
      });
    }
  }
}

export const shippingService = new ShippingService();
