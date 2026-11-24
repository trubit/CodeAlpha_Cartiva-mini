import { Types, type FilterQuery } from 'mongoose';
import {
  ShippingConfiguration,
  type ShippingConfigurationDocument,
} from '../../models/ShippingConfiguration.model.js';
import type { CreateShippingConfigDto, UpdateShippingConfigDto } from '@shared/api.types.js';
import { buildStateMatchingRegex } from './location-normalizer.js';

export class ShippingRepository {
  /**
   * Finds all active shipping configurations covering a specific country and state.
   * Matches case-insensitively, canonicalizes state variations, and supports wildcards '*' and 'All'.
   */
  public async findActiveConfigsForLocation(
    country: string,
    state: string
  ): Promise<ShippingConfigurationDocument[]> {
    const escapedCountry = country.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const countryRegex = new RegExp(`^(?:${escapedCountry}|\\*|all|nationwide)$`, 'i');
    const stateRegex = buildStateMatchingRegex(state);

    return ShippingConfiguration.find({
      isActive: true,
      countriesCovered: { $elemMatch: { $regex: countryRegex } },
      statesCovered: { $elemMatch: { $regex: stateRegex } },
    }).sort({ baseRate: 1 });
  }

  /**
   * Finds a shipping configuration by its primary ID.
   */
  public async findById(id: string): Promise<ShippingConfigurationDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ShippingConfiguration.findById(id);
  }

  /**
   * Retrieves all shipping configurations with optional filters (for admin management).
   */
  public async findAll(filters: {
    isActive?: boolean;
    country?: string;
    state?: string;
    search?: string;
  }): Promise<ShippingConfigurationDocument[]> {
    const query: FilterQuery<ShippingConfigurationDocument> = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.country) {
      const countryRegex = new RegExp(
        `^(?:${filters.country.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|\\*|all)$`,
        'i'
      );
      query.countriesCovered = { $elemMatch: { $regex: countryRegex } };
    }

    if (filters.state) {
      const stateRegex = new RegExp(
        `^(?:${filters.state.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|\\*|all)$`,
        'i'
      );
      query.statesCovered = { $elemMatch: { $regex: stateRegex } };
    }

    if (filters.search) {
      const searchRegex = new RegExp(
        filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      query.$or = [
        { zoneName: { $regex: searchRegex } },
        { methodName: { $regex: searchRegex } },
        { carrierName: { $regex: searchRegex } },
      ];
    }

    return ShippingConfiguration.find(query).sort({ zoneName: 1, baseRate: 1 });
  }

  /**
   * Creates a new shipping configuration.
   */
  public async create(data: CreateShippingConfigDto): Promise<ShippingConfigurationDocument> {
    return ShippingConfiguration.create(data);
  }

  /**
   * Updates an existing shipping configuration by ID.
   */
  public async update(
    id: string,
    updateData: UpdateShippingConfigDto
  ): Promise<ShippingConfigurationDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ShippingConfiguration.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Deletes a shipping configuration by ID.
   */
  public async delete(id: string): Promise<ShippingConfigurationDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ShippingConfiguration.findByIdAndDelete(id);
  }
}

export const shippingRepository = new ShippingRepository();
