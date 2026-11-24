import type { UpdateQuery } from 'mongoose';
import { User, type UserDocument } from '../../models/User.model.js';
import { Session, type SessionDocument } from '../../models/Session.model.js';

export class AuthRepository {
  /**
   * Find a user by email, optionally projecting hidden password hash or security tokens.
   */
  public async findUserByEmail(
    email: string,
    includeSecrets: boolean = false
  ): Promise<UserDocument | null> {
    const query = User.findOne({ email: email.toLowerCase().trim() });
    if (includeSecrets) {
      query.select('+passwordHash +failedLoginAttempts +lockUntil +tokenVersion');
    }
    return query.exec();
  }

  /**
   * Find a user by ObjectId.
   */
  public async findUserById(
    id: string,
    includeSecrets: boolean = false
  ): Promise<UserDocument | null> {
    const query = User.findById(id);
    if (includeSecrets) {
      query.select('+passwordHash +tokenVersion');
    }
    return query.exec();
  }

  /**
   * Find user by hashed verification token with expiration check.
   */
  public async findUserByVerificationToken(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    })
      .select('+emailVerificationToken +emailVerificationExpires')
      .exec();
  }

  /**
   * Find user by hashed password reset token with expiration check.
   */
  public async findUserByResetToken(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    })
      .select('+passwordResetToken +passwordResetExpires +tokenVersion')
      .exec();
  }

  /**
   * Create a new user account.
   */
  public async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
  }): Promise<UserDocument> {
    return User.create(data);
  }

  /**
   * Update a user document.
   */
  public async updateUser(
    id: string,
    updates: UpdateQuery<UserDocument>
  ): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(id, updates, { new: true }).exec();
  }

  /**
   * Increment failed login attempts or set account lockUntil.
   */
  public async recordFailedLogin(id: string, lockUntil?: Date): Promise<void> {
    const updates: UpdateQuery<UserDocument> = {
      $inc: { failedLoginAttempts: 1 },
    };
    if (lockUntil) {
      updates.$set = { lockUntil };
    }
    await User.findByIdAndUpdate(id, updates).exec();
  }

  /**
   * Reset failed login attempts and clear lock on successful authentication.
   */
  public async recordSuccessfulLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      $set: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
      $unset: { lockUntil: 1 },
    }).exec();
  }

  /**
   * Create a new session record.
   */
  public async createSession(data: {
    userId: string;
    sessionId: string;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<SessionDocument> {
    return Session.create(data);
  }

  /**
   * Find session by hashed refresh token.
   */
  public async findSessionByTokenHash(refreshTokenHash: string): Promise<SessionDocument | null> {
    return Session.findOne({
      refreshTokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  /**
   * Find session by sessionId string.
   */
  public async findSessionById(sessionId: string): Promise<SessionDocument | null> {
    return Session.findOne({ sessionId }).exec();
  }

  /**
   * List all active, non-revoked sessions for a user.
   */
  public async findActiveSessionsByUserId(userId: string): Promise<SessionDocument[]> {
    return Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .exec();
  }

  /**
   * Revoke a single session by sessionId.
   */
  public async revokeSession(sessionId: string): Promise<boolean> {
    const result = await Session.updateOne(
      { sessionId, isRevoked: false },
      { $set: { isRevoked: true } }
    ).exec();
    return result.modifiedCount > 0;
  }

  /**
   * Revoke all active sessions for a user (e.g. on password change or logout-all).
   */
  public async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await Session.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    ).exec();
    return result.modifiedCount;
  }

  /**
   * Rotate a session's refresh token hash.
   */
  public async rotateSessionToken(
    sessionId: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date
  ): Promise<SessionDocument | null> {
    return Session.findOneAndUpdate(
      { sessionId, isRevoked: false },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
          lastActiveAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }
}

export const authRepository = new AuthRepository();
