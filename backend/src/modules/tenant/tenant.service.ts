import { Tenant, DEFAULT_TENANT_ID, type ITenant } from './tenant.model.js';
import mongoose from 'mongoose';

export class TenantService {
  /**
   * Ensures the platform default master tenant exists and backfills missing tenantId references.
   */
  public static async ensureDefaultTenant(): Promise<ITenant> {
    let defaultTenant = await Tenant.findOne({ tenantId: DEFAULT_TENANT_ID });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        tenantId: DEFAULT_TENANT_ID,
        name: 'Cartiva Central Platform',
        slug: 'default-cartiva',
        status: 'active',
        type: 'platform',
        settings: {
          currency: 'NGN',
          brandColor: '#101D3B',
          contactEmail: 'support@cartivamini.ng',
        },
      });
    }
    return defaultTenant;
  }

  /**
   * Safe migration helper that ensures existing un-tenanted products, orders,
   * inventories, and audit logs are assigned the default system tenant.
   */
  public static async runTenantMigration(): Promise<{
    migratedProducts: number;
    migratedOrders: number;
    migratedInventories: number;
  }> {
    await this.ensureDefaultTenant();

    const db = mongoose.connection.db;
    if (!db) {
      return { migratedProducts: 0, migratedOrders: 0, migratedInventories: 0 };
    }

    const productsRes = await db
      .collection('products')
      .updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: DEFAULT_TENANT_ID } }
      );

    const ordersRes = await db
      .collection('orders')
      .updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: DEFAULT_TENANT_ID } }
      );

    const inventoriesRes = await db
      .collection('inventories')
      .updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: DEFAULT_TENANT_ID } }
      );

    return {
      migratedProducts: productsRes.modifiedCount,
      migratedOrders: ordersRes.modifiedCount,
      migratedInventories: inventoriesRes.modifiedCount,
    };
  }

  /**
   * Resolves or creates a company/tenant by tenantId
   */
  public static async getTenantById(tenantId: string): Promise<ITenant | null> {
    return Tenant.findOne({ tenantId: tenantId.toLowerCase(), status: 'active' });
  }

  /**
   * Registers a new tenant organization/company
   */
  public static async createTenant(data: {
    tenantId: string;
    name: string;
    slug: string;
    type?: 'company' | 'store' | 'vendor';
    settings?: Record<string, unknown>;
  }): Promise<ITenant> {
    const existing = await Tenant.findOne({
      $or: [{ tenantId: data.tenantId.toLowerCase() }, { slug: data.slug.toLowerCase() }],
    });
    if (existing) {
      throw new Error(`Tenant with identifier '${data.tenantId}' or slug '${data.slug}' already exists.`);
    }

    return Tenant.create({
      tenantId: data.tenantId.toLowerCase(),
      name: data.name,
      slug: data.slug.toLowerCase(),
      type: data.type || 'company',
      status: 'active',
      settings: data.settings || { currency: 'NGN' },
    });
  }
}

