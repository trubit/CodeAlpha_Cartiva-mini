import { Types } from 'mongoose';
import { Category, type CategoryDocument } from '../../models/Category.model.js';
import { Product } from '../../models/Product.model.js';
import { AuditLog, type AuditLogDocument } from '../../models/AuditLog.model.js';

export class CategoryRepository {
  public async create(data: Partial<CategoryDocument>): Promise<CategoryDocument> {
    return Category.create(data);
  }

  public async findById(id: string): Promise<CategoryDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Category.findById(id);
  }

  public async findBySlug(slug: string): Promise<CategoryDocument | null> {
    return Category.findOne({ slug });
  }

  public async findAll(filter: Record<string, unknown> = {}): Promise<CategoryDocument[]> {
    return Category.find(filter).sort({ displayOrder: 1, name: 1 });
  }

  public async findSubCategories(parentId: string): Promise<CategoryDocument[]> {
    if (!Types.ObjectId.isValid(parentId)) return [];
    return Category.find({ parentId: new Types.ObjectId(parentId) }).sort({
      displayOrder: 1,
      name: 1,
    });
  }

  public async update(
    id: string,
    updateData: Record<string, unknown>
  ): Promise<CategoryDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Category.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  }

  public async delete(id: string): Promise<CategoryDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Category.findByIdAndDelete(id);
  }

  public async countProductsByCategoryId(categoryId: string): Promise<number> {
    if (!Types.ObjectId.isValid(categoryId)) return 0;
    const catObjId = new Types.ObjectId(categoryId);
    return Product.countDocuments({
      $or: [{ categoryId: catObjId }, { subCategoryId: catObjId }],
    });
  }

  public async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query['_id'] = { $ne: new Types.ObjectId(excludeId) };
    }
    const count = await Category.countDocuments(query);
    return count > 0;
  }

  /**
   * Traverses upwards from candidateParentId to check if categoryId appears in ancestors.
   * If candidateParentId leads to categoryId, setting it would form a circular cycle.
   */
  public async isCircularReference(
    categoryId: string,
    candidateParentId: string
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(categoryId) || !Types.ObjectId.isValid(candidateParentId)) {
      return false;
    }

    if (categoryId === candidateParentId) {
      return true;
    }

    let currentParentId: Types.ObjectId | null = new Types.ObjectId(candidateParentId);
    const visited = new Set<string>();

    while (currentParentId) {
      const currentStr = currentParentId.toString();
      if (currentStr === categoryId) {
        return true; // Cycle detected
      }

      if (visited.has(currentStr)) {
        return true; // Already visited in loop
      }
      visited.add(currentStr);

      const parentDoc: CategoryDocument | null =
        await Category.findById(currentParentId).select('parentId');
      if (!parentDoc || !parentDoc.parentId) {
        break;
      }

      currentParentId = parentDoc.parentId as Types.ObjectId;
    }

    return false;
  }

  public async logAudit(data: {
    actorId: string;
    actorRole: string;
    action: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
    changesDiff?: { before?: unknown; after?: unknown };
  }): Promise<AuditLogDocument> {
    return AuditLog.create({
      actorId: new Types.ObjectId(data.actorId),
      actorRole: data.actorRole,
      action: data.action,
      entity: 'Category',
      entityId: new Types.ObjectId(data.entityId),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      changesDiff: data.changesDiff,
    });
  }
}

export const categoryRepository = new CategoryRepository();
