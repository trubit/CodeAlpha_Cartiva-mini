import { Types } from 'mongoose';
import { User, type UserDocument } from '../../models/User.model.js';
import { Address, type AddressDocument } from '../../models/Address.model.js';
import { Session } from '../../models/Session.model.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import type { IAddress } from '@shared/models.types.js';

class UserRepository {
  // ==========================================================================
  // User Account Queries
  // ==========================================================================

  public async findById(userId: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return User.findById(userId);
  }

  public async findByIdWithPassword(userId: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return User.findById(userId).select('+passwordHash');
  }

  public async findByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  public async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }
  ): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(userId, { $set: data }, { new: true, runValidators: true });
  }

  public async setPendingEmailChange(
    userId: string,
    pendingEmail: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          pendingEmail,
          emailChangeToken: tokenHash,
          emailChangeExpires: expiresAt,
        },
      },
      { new: true }
    );
  }

  public async findByEmailChangeToken(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      emailChangeToken: tokenHash,
      emailChangeExpires: { $gt: new Date() },
    }).select('+emailChangeToken +emailChangeExpires');
  }

  public async completeEmailChange(userId: string, newEmail: string): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          email: newEmail,
          isEmailVerified: true,
        },
        $unset: {
          pendingEmail: 1,
          emailChangeToken: 1,
          emailChangeExpires: 1,
        },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }

  public async deactivateUser(userId: string, reason?: string): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isActive: false,
          deactivationReason: reason || 'Customer requested deactivation',
        },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }

  public async requestDeletion(userId: string, reason: string): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          deletionStatus: 'pending',
          deletionRequestedAt: new Date(),
          deletionReason: reason,
        },
      },
      { new: true }
    );
  }

  public async listUsers(
    filter: Record<string, unknown>,
    skip: number,
    limit: number
  ): Promise<UserDocument[]> {
    return User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  public async countUsers(filter: Record<string, unknown>): Promise<number> {
    return User.countDocuments(filter);
  }

  public async updateUserStatus(userId: string, isActive: boolean): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: { isActive },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }

  // ==========================================================================
  // Address Queries
  // ==========================================================================

  public async findAddressesByUserId(userId: string): Promise<AddressDocument[]> {
    return Address.find({ userId: new Types.ObjectId(userId) }).sort({
      isDefaultShipping: -1,
      createdAt: -1,
    });
  }

  public async findAddressByIdAndUserId(
    addressId: string,
    userId: string
  ): Promise<AddressDocument | null> {
    if (!Types.ObjectId.isValid(addressId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return Address.findOne({
      _id: new Types.ObjectId(addressId),
      userId: new Types.ObjectId(userId),
    });
  }

  public async countAddressesByUserId(userId: string): Promise<number> {
    return Address.countDocuments({ userId: new Types.ObjectId(userId) });
  }

  public async createAddress(
    data: Partial<IAddress> & { userId: string }
  ): Promise<AddressDocument> {
    return Address.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
  }

  public async updateAddress(
    addressId: string,
    userId: string,
    data: Partial<IAddress>
  ): Promise<AddressDocument | null> {
    return Address.findOneAndUpdate(
      { _id: new Types.ObjectId(addressId), userId: new Types.ObjectId(userId) },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  public async deleteAddress(addressId: string, userId: string): Promise<boolean> {
    const res = await Address.deleteOne({
      _id: new Types.ObjectId(addressId),
      userId: new Types.ObjectId(userId),
    });
    return res.deletedCount > 0;
  }

  public async unsetDefaultsForUser(userId: string): Promise<void> {
    await Address.updateMany(
      { userId: new Types.ObjectId(userId) },
      { $set: { isDefaultShipping: false, isDefaultBilling: false } }
    );
  }

  public async setDefaultAddress(
    addressId: string,
    userId: string
  ): Promise<AddressDocument | null> {
    // Unset all existing defaults for this customer
    await this.unsetDefaultsForUser(userId);

    // Set selected address as default
    return Address.findOneAndUpdate(
      { _id: new Types.ObjectId(addressId), userId: new Types.ObjectId(userId) },
      { $set: { isDefaultShipping: true, isDefaultBilling: true } },
      { new: true }
    );
  }

  public async findFirstAddressByUserId(userId: string): Promise<AddressDocument | null> {
    return Address.findOne({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  // ==========================================================================
  // Session & Audit Queries
  // ==========================================================================

  public async countActiveSessionsByUserId(userId: string): Promise<number> {
    return Session.countDocuments({
      userId: new Types.ObjectId(userId),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  public async revokeAllSessionsForUser(userId: string): Promise<void> {
    await Session.updateMany({ userId: new Types.ObjectId(userId) }, { $set: { isRevoked: true } });
  }

  public async logAuditAction(entry: {
    actorId?: string;
    actorRole?: string;
    action: string;
    entity: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
    changesDiff?: { before?: unknown; after?: unknown };
  }): Promise<void> {
    try {
      await AuditLog.create({
        ...entry,
        actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : undefined,
      });
    } catch {
      // Audit log failures should not abort the primary transaction
    }
  }
}

export const userRepository = new UserRepository();
