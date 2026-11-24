import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { userRepository } from './user.repository.js';
import { storageService } from './storage.service.js';
import { emailService } from '../../services/email.service.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { MAX_USER_ADDRESSES, EMAIL_CHANGE_TOKEN_EXPIRY_MS } from './user.constants.js';
import { normalizeNigerianLocation } from '../shipping/location-normalizer.js';
import type { UserDocument } from '../../models/User.model.js';
import { User } from '../../models/User.model.js';
import type { AddressDocument } from '../../models/Address.model.js';
import { Cart } from '../../models/Cart.model.js';
import { Wishlist } from '../../models/Wishlist.model.js';
import { UserRole } from '@shared/enums.js';

import type {
  SafeUser,
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
  CustomerDashboardSummaryDto,
  AdminUserListItemDto,
  AdminUserDetailDto,
  CreateStaffDto,
  UpdateStaffRoleDto,
  AdminStaffItemDto,
} from '@shared/api.types.js';
import type {
  CustomerProfileView,
  AdminUserPaginationOptions,
  PaginatedAdminUsers,
} from './user.types.js';

class UserService {
  // ==========================================================================
  // Helper: Format SafeUser
  // ==========================================================================

  public formatSafeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      pendingEmail: user.pendingEmail,
      deletionStatus: user.deletionStatus || 'none',
      createdAt: user.createdAt.toISOString(),
    };
  }

  public formatAddress(address: AddressDocument): AddressDto {
    return {
      id: address._id.toString(),
      recipientName: address.recipientName,
      phone: address.phone,
      streetAddress: address.streetAddress,
      apartmentSuite: address.apartmentSuite,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      deliveryInstructions: address.deliveryInstructions,
      isDefault: address.isDefaultShipping,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  // ==========================================================================
  // 1. Profile Management
  // ==========================================================================

  public async getProfile(userId: string): Promise<CustomerProfileView> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const addressCount = await userRepository.countAddressesByUserId(userId);
    const safeUser = this.formatSafeUser(user);

    return {
      ...safeUser,
      addressCount,
    };
  }

  public async updateProfile(
    userId: string,
    dto: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account is deactivated or suspended.', ErrorCodes.ACCOUNT_INACTIVE);
    }

    const updated = await userRepository.updateProfile(userId, {
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      phone: dto.phone?.trim(),
    });

    if (!updated) {
      throw AppError.internal('Failed to update user profile.');
    }

    return this.formatSafeUser(updated);
  }

  // ==========================================================================
  // 2. Avatar Management
  // ==========================================================================

  public async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ avatarUrl: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const oldAvatarUrl = user.avatarUrl;
    const uploadResult = await storageService.uploadAvatar(userId, fileBuffer, mimeType);

    // Save avatar URL on user document
    await userRepository.updateProfile(userId, { avatarUrl: uploadResult.url });

    // Clean up old avatar if it existed
    if (oldAvatarUrl && oldAvatarUrl !== uploadResult.url) {
      await storageService.deleteAvatar(oldAvatarUrl);
    }

    return { avatarUrl: uploadResult.url };
  }

  public async deleteAvatar(userId: string): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    if (user.avatarUrl) {
      await storageService.deleteAvatar(user.avatarUrl);
      await userRepository.updateProfile(userId, { avatarUrl: undefined });
    }

    return { message: 'Profile avatar removed successfully.' };
  }

  // ==========================================================================
  // 3. Address Management
  // ==========================================================================

  public async getUserAddresses(userId: string): Promise<AddressDto[]> {
    const addresses = await userRepository.findAddressesByUserId(userId);
    return addresses.map((addr) => this.formatAddress(addr));
  }

  public async createAddress(userId: string, dto: CreateAddressDto): Promise<AddressDto> {
    const currentCount = await userRepository.countAddressesByUserId(userId);
    if (currentCount >= MAX_USER_ADDRESSES) {
      throw AppError.badRequest(
        `Maximum address limit reached. Customers may save up to ${MAX_USER_ADDRESSES} delivery addresses.`,
        ErrorCodes.MAX_ADDRESSES_REACHED
      );
    }

    // Determine default status: if user has no addresses, or explicitly sets default
    const shouldBeDefault = currentCount === 0 || dto.isDefault === true;

    if (shouldBeDefault) {
      await userRepository.unsetDefaultsForUser(userId);
    }

    const normalized = normalizeNigerianLocation(
      dto.state,
      dto.city,
      dto.streetAddress,
      dto.country
    );

    const created = await userRepository.createAddress({
      userId,
      recipientName: dto.recipientName.trim(),
      phone: dto.phone.trim(),
      streetAddress: dto.streetAddress.trim(),
      apartmentSuite: dto.apartmentSuite?.trim(),
      city: normalized.city,
      state: normalized.state,
      postalCode: dto.postalCode?.trim(),
      country: normalized.country,
      deliveryInstructions: dto.deliveryInstructions?.trim(),
      isDefaultShipping: shouldBeDefault,
      isDefaultBilling: shouldBeDefault,
    });

    return this.formatAddress(created);
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto
  ): Promise<AddressDto> {
    const existing = await userRepository.findAddressByIdAndUserId(addressId, userId);
    if (!existing) {
      throw AppError.notFound(
        'Address not found or does not belong to your account.',
        ErrorCodes.ADDRESS_NOT_FOUND
      );
    }

    if (dto.isDefault === true) {
      await userRepository.unsetDefaultsForUser(userId);
    }

    const normalized = normalizeNigerianLocation(
      dto.state ?? existing.state,
      dto.city ?? existing.city,
      dto.streetAddress ?? existing.streetAddress,
      dto.country ?? existing.country
    );

    const updated = await userRepository.updateAddress(addressId, userId, {
      recipientName: dto.recipientName?.trim(),
      phone: dto.phone?.trim(),
      streetAddress: dto.streetAddress?.trim(),
      apartmentSuite: dto.apartmentSuite?.trim(),
      city: normalized.city,
      state: normalized.state,
      postalCode: dto.postalCode?.trim(),
      country: normalized.country,
      deliveryInstructions: dto.deliveryInstructions?.trim(),
      ...(dto.isDefault !== undefined && {
        isDefaultShipping: dto.isDefault,
        isDefaultBilling: dto.isDefault,
      }),
    });

    if (!updated) {
      throw AppError.internal('Failed to update address.');
    }

    return this.formatAddress(updated);
  }

  public async deleteAddress(userId: string, addressId: string): Promise<{ message: string }> {
    const existing = await userRepository.findAddressByIdAndUserId(addressId, userId);
    if (!existing) {
      throw AppError.notFound(
        'Address not found or does not belong to your account.',
        ErrorCodes.ADDRESS_NOT_FOUND
      );
    }

    const wasDefault = existing.isDefaultShipping;
    await userRepository.deleteAddress(addressId, userId);

    // If deleted address was default, promote the newest remaining address to default
    if (wasDefault) {
      const remaining = await userRepository.findFirstAddressByUserId(userId);
      if (remaining) {
        await userRepository.setDefaultAddress(remaining._id.toString(), userId);
      }
    }

    return { message: 'Address removed successfully.' };
  }

  public async setDefaultAddress(userId: string, addressId: string): Promise<AddressDto> {
    const existing = await userRepository.findAddressByIdAndUserId(addressId, userId);
    if (!existing) {
      throw AppError.notFound(
        'Address not found or does not belong to your account.',
        ErrorCodes.ADDRESS_NOT_FOUND
      );
    }

    const updated = await userRepository.setDefaultAddress(addressId, userId);
    if (!updated) {
      throw AppError.internal('Failed to set default address.');
    }

    return this.formatAddress(updated);
  }

  // ==========================================================================
  // 4. Email Change Workflow
  // ==========================================================================

  public async requestEmailChange(
    userId: string,
    currentEmail: string,
    newEmail: string
  ): Promise<{ message: string }> {
    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (normalizedNewEmail === currentEmail.trim().toLowerCase()) {
      throw AppError.badRequest(
        'The new email address cannot be identical to your current email address.',
        ErrorCodes.BAD_REQUEST
      );
    }

    // Check if new email is already in use by another account
    const existing = await userRepository.findByEmail(normalizedNewEmail);
    if (existing) {
      throw AppError.conflict(
        'This email address is already associated with an existing account.',
        ErrorCodes.EMAIL_ALREADY_IN_USE
      );
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    // Generate high-entropy 32-byte token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_EXPIRY_MS);

    await userRepository.setPendingEmailChange(userId, normalizedNewEmail, tokenHash, expiresAt);

    // Send verification email to the NEW email address
    await emailService.sendEmailChangeVerificationEmail(
      normalizedNewEmail,
      user.firstName,
      rawToken
    );

    return {
      message:
        'A confirmation email has been dispatched to your new email address. Please click the link within 24 hours to finalize this change.',
    };
  }

  public async verifyEmailChange(token: string): Promise<SafeUser> {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await userRepository.findByEmailChangeToken(tokenHash);
    if (!user || !user.pendingEmail) {
      throw AppError.badRequest(
        'Email confirmation link is invalid or has expired. Please initiate a new email change request.',
        ErrorCodes.INVALID_TOKEN
      );
    }

    const newEmail = user.pendingEmail;

    // Check if new email was claimed by another user in the interim
    const collision = await userRepository.findByEmail(newEmail);
    if (collision && collision._id.toString() !== user._id.toString()) {
      throw AppError.conflict(
        'This email address has already been claimed by another account.',
        ErrorCodes.EMAIL_ALREADY_IN_USE
      );
    }

    const updated = await userRepository.completeEmailChange(user._id.toString(), newEmail);
    if (!updated) {
      throw AppError.internal('Failed to finalize email address update.');
    }

    // Terminate all sessions to force re-authentication with new email
    await userRepository.revokeAllSessionsForUser(user._id.toString());

    return this.formatSafeUser(updated);
  }

  public async resendEmailChange(userId: string): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    if (!user.pendingEmail) {
      throw AppError.badRequest(
        'There is no active email change request for this account.',
        ErrorCodes.BAD_REQUEST
      );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_EXPIRY_MS);

    await userRepository.setPendingEmailChange(userId, user.pendingEmail, tokenHash, expiresAt);

    await emailService.sendEmailChangeVerificationEmail(
      user.pendingEmail,
      user.firstName,
      rawToken
    );

    return {
      message: 'Email confirmation link has been resent to your new email address.',
    };
  }

  // ==========================================================================
  // 5. Account Deactivation & Deletion
  // ==========================================================================

  public async requestDeactivation(
    userId: string,
    currentPassword: string,
    reason?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ message: string }> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.passwordHash) {
      throw AppError.notFound('User account not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Incorrect password.', ErrorCodes.INVALID_CREDENTIALS);
    }

    await userRepository.deactivateUser(userId, reason);
    await userRepository.revokeAllSessionsForUser(userId);

    await userRepository.logAuditAction({
      actorId: userId,
      actorRole: user.role,
      action: 'USER_ACCOUNT_DEACTIVATED',
      entity: 'User',
      entityId: userId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: { isActive: true }, after: { isActive: false, reason } },
    });

    await emailService.sendAccountDeactivationNotice(user.email, user.firstName);

    return {
      message:
        'Your account has been deactivated. All active sessions have been terminated. Contact support if you wish to reactivate in the future.',
    };
  }

  public async requestDeletion(
    userId: string,
    currentPassword: string,
    reason: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ message: string }> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.passwordHash) {
      throw AppError.notFound('User account not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Incorrect password.', ErrorCodes.INVALID_CREDENTIALS);
    }

    if (user.deletionStatus === 'pending') {
      throw AppError.conflict(
        'An account deletion request is already pending review for this account.',
        ErrorCodes.DELETION_ALREADY_REQUESTED
      );
    }

    await userRepository.requestDeletion(userId, reason);

    const auditRef = crypto.randomUUID();
    await userRepository.logAuditAction({
      actorId: userId,
      actorRole: user.role,
      action: 'USER_ACCOUNT_DELETION_REQUESTED',
      entity: 'User',
      entityId: userId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { after: { reason, referenceId: auditRef } },
    });

    await emailService.sendDeletionRequestConfirmation(user.email, user.firstName, auditRef);

    return {
      message:
        'Your deletion request has been registered. In accordance with data retention regulations, our compliance team will process your request while preserving necessary financial and order records.',
    };
  }

  public async getDeletionStatus(userId: string): Promise<{
    deletionStatus: string;
    deletionRequestedAt?: string;
    deletionReason?: string;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    return {
      deletionStatus: user.deletionStatus || 'none',
      deletionRequestedAt: user.deletionRequestedAt?.toISOString(),
      deletionReason: user.deletionReason,
    };
  }

  // ==========================================================================
  // 6. Dashboard Summary
  // ==========================================================================

  public async getDashboardSummary(userId: string): Promise<CustomerDashboardSummaryDto> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const [addressCount, activeSessionCount, cart, wishlist] = await Promise.all([
      userRepository.countAddressesByUserId(userId),
      userRepository.countActiveSessionsByUserId(userId),
      Cart.findOne({ userId }),
      Wishlist.findOne({ userId }),
    ]);

    const cartItemCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const wishlistCount = wishlist ? wishlist.items.length : 0;

    return {
      user: this.formatSafeUser(user),
      addressCount,
      activeSessionCount,
      cartItemCount,
      orderCount: 0, // Scheduled for Phase 12
      wishlistCount,
    };
  }

  // ==========================================================================
  // 7. Administrative Customer Management
  // ==========================================================================

  public async adminListUsers(options: AdminUserPaginationOptions): Promise<PaginatedAdminUsers> {
    const filter: Record<string, unknown> = {};

    if (options.role) {
      filter.role = options.role;
    }

    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }

    if (options.deletionStatus) {
      filter.deletionStatus = options.deletionStatus;
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
      ];
    }

    const page = Math.max(1, options.page);
    const limit = Math.min(100, Math.max(1, options.limit));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userRepository.listUsers(filter, skip, limit),
      userRepository.countUsers(filter),
    ]);

    const usersWithCounts: AdminUserListItemDto[] = await Promise.all(
      users.map(async (u) => {
        const addressCount = await userRepository.countAddressesByUserId(u._id.toString());
        return {
          id: u._id.toString(),
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          isEmailVerified: u.isEmailVerified,
          avatarUrl: u.avatarUrl,
          addressCount,
          deletionStatus: u.deletionStatus || 'none',
          createdAt: u.createdAt.toISOString(),
        };
      })
    );

    return {
      users: usersWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async adminGetUserDetail(targetUserId: string): Promise<AdminUserDetailDto> {
    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User account not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const addresses = await userRepository.findAddressesByUserId(targetUserId);

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
      addressCount: addresses.length,
      deletionStatus: user.deletionStatus || 'none',
      deactivationReason: user.deactivationReason,
      deletionRequestedAt: user.deletionRequestedAt?.toISOString(),
      deletionReason: user.deletionReason,
      createdAt: user.createdAt.toISOString(),
      addresses: addresses.map((addr) => this.formatAddress(addr)),
      activeSessions: [], // Detailed session tokens are never returned
    };
  }

  public async adminUpdateUserStatus(
    adminId: string,
    targetUserId: string,
    isActive: boolean,
    reason: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<SafeUser> {
    if (adminId === targetUserId && !isActive) {
      throw AppError.badRequest(
        'Administrators cannot suspend or deactivate their own account.',
        ErrorCodes.BAD_REQUEST
      );
    }

    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const previousStatus = targetUser.isActive;
    const updated = await userRepository.updateUserStatus(targetUserId, isActive);
    if (!updated) {
      throw AppError.internal('Failed to update user status.');
    }

    // If deactivating user, terminate all their sessions
    if (!isActive) {
      await userRepository.revokeAllSessionsForUser(targetUserId);
    }

    await userRepository.logAuditAction({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_USER_STATUS',
      entity: 'User',
      entityId: targetUserId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: {
        before: { isActive: previousStatus },
        after: { isActive, reason },
      },
    });

    return this.formatSafeUser(updated);
  }

  // ==========================================================================
  // 8. Staff & Administrator Account Management
  // ==========================================================================

  public async adminListStaff(): Promise<AdminStaffItemDto[]> {
    const staffMembers = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.STAFF] },
    }).sort({ createdAt: -1 });

    return staffMembers.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role as UserRole,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString(),
      createdAt: u.createdAt.toISOString(),
    }));
  }

  public async adminCreateStaff(
    adminId: string,
    dto: CreateStaffDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<SafeUser> {
    const existing = await User.findOne({ email: dto.email.toLowerCase().trim() });
    if (existing) {
      throw AppError.conflict(
        `User with email '${dto.email}' already exists.`,
        ErrorCodes.USER_ALREADY_EXISTS
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = await User.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim(),
      role: dto.role,
      isEmailVerified: true,
      isActive: true,
    });

    await userRepository.logAuditAction({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_CREATE_STAFF',
      entity: 'User',
      entityId: newUser._id.toString(),
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: {
        after: {
          email: newUser.email,
          role: newUser.role,
          name: `${newUser.firstName} ${newUser.lastName}`,
        },
      },
    });

    return this.formatSafeUser(newUser);
  }

  public async adminUpdateStaffRole(
    adminId: string,
    targetUserId: string,
    dto: UpdateStaffRoleDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<SafeUser> {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('User not found.', ErrorCodes.USER_NOT_FOUND);
    }

    // Safety checks against administrative lockout & self-demotion
    const isDemotingAdmin = targetUser.role === UserRole.ADMIN && dto.role === UserRole.STAFF;
    const isDeactivatingAdmin = targetUser.role === UserRole.ADMIN && dto.isActive === false;

    if (isDemotingAdmin || isDeactivatingAdmin) {
      if (adminId === targetUserId) {
        throw AppError.badRequest(
          'Administrators cannot demote or deactivate their own administrative credentials.',
          ErrorCodes.BAD_REQUEST
        );
      }

      const activeAdminsCount = await User.countDocuments({
        role: UserRole.ADMIN,
        isActive: true,
      });

      if (activeAdminsCount <= 1) {
        throw AppError.badRequest(
          'Operation prohibited: Cannot demote or deactivate the last remaining active Administrator account. A platform must always retain at least one operational Administrator.',
          ErrorCodes.BAD_REQUEST
        );
      }
    }

    const prevRole = targetUser.role;
    const prevActive = targetUser.isActive;

    if (dto.role) targetUser.role = dto.role;
    if (dto.isActive !== undefined) targetUser.isActive = dto.isActive;

    await targetUser.save();

    await userRepository.logAuditAction({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_STAFF_ROLE',
      entity: 'User',
      entityId: targetUserId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: {
        before: { role: prevRole, isActive: prevActive },
        after: { role: targetUser.role, isActive: targetUser.isActive },
      },
    });

    return this.formatSafeUser(targetUser);
  }

  public async adminReviewDeletionRequest(
    adminId: string,
    targetUserId: string,
    deletionStatus: 'approved' | 'rejected',
    reason?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<SafeUser> {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const prevDeletionStatus = targetUser.deletionStatus;
    targetUser.deletionStatus = deletionStatus;

    if (deletionStatus === 'approved') {
      targetUser.isActive = false;
      targetUser.deactivationReason = `Account deletion request approved: ${reason || 'Approved by compliance officer.'}`;
      await userRepository.revokeAllSessionsForUser(targetUserId);
    }

    await targetUser.save();

    await userRepository.logAuditAction({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_REVIEW_DELETION_REQUEST',
      entity: 'User',
      entityId: targetUserId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: {
        before: { deletionStatus: prevDeletionStatus },
        after: { deletionStatus, reason },
      },
    });

    return this.formatSafeUser(targetUser);
  }
}


export const userService = new UserService();
