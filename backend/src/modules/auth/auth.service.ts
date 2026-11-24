import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import type {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SafeUser,
  SessionDto,
} from '@shared/api.types.js';
import { type UserDocument } from '../../models/User.model.js';
import { authRepository, type AuthRepository } from './auth.repository.js';
import { AUTH_CONSTANTS } from './auth.constants.js';
import type { JwtAccessPayload, JwtRefreshPayload } from './auth.types.js';
import { emailService } from '../../services/email.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { NotificationType, NotificationChannel, NotificationPriority } from '@shared/enums.js';
import { otpService } from './otp.service.js';
import { type OtpPurpose } from '../../models/Otp.model.js';

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const toSafeUser = (user: UserDocument): SafeUser => ({
  id: user._id.toString(),
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
});

export class AuthService {
  private repository: AuthRepository;

  constructor(repo: AuthRepository = authRepository) {
    this.repository = repo;
  }

  /**
   * Generates a signed short-lived JWT access token.
   */
  public generateAccessToken(user: UserDocument): string {
    const payload: JwtAccessPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generates a signed long-lived JWT refresh token.
   */
  public generateRefreshToken(user: UserDocument, sessionId: string): string {
    const payload: JwtRefreshPayload = {
      sub: user._id.toString(),
      sessionId,
      tokenVersion: user.tokenVersion ?? 0,
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: `${AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });
  }

  /**
   * Verify an access token.
   */
  public verifyAccessToken(token: string): JwtAccessPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    } catch {
      throw AppError.unauthorized(
        'Invalid or expired authentication token.',
        ErrorCodes.UNAUTHORIZED
      );
    }
  }

  /**
   * Verify a refresh token.
   */
  public verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.', ErrorCodes.UNAUTHORIZED);
    }
  }

  /**
   * Register a new customer account.
   */
  public async register(dto: RegisterDto): Promise<{ user: SafeUser; message: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check for existing account
    const existingUser = await this.repository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw AppError.conflict(
        'An account with this email address already exists. Please log in or use password recovery.',
        ErrorCodes.USER_ALREADY_EXISTS
      );
    }

    // Hash password with bcrypt work factor 12
    const passwordHash = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

    // Create user with CUSTOMER role (mass assignment prevention)
    const newUser = await this.repository.createUser({
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim(),
    });

    // Generate and send cryptographically secure 6-digit numeric OTP via Brevo REST API
    try {
      await otpService.generateAndSendOtp(
        { id: newUser._id.toString(), email: newUser.email, firstName: newUser.firstName },
        'email_verification'
      );
    } catch (otpErr) {
      logger.error({ err: otpErr }, 'Failed to dispatch OTP during registration');
    }

    // Send in-app welcome notification
    await notificationService.notify({
      eventType: NotificationType.ACCOUNT_WELCOME,
      recipientId: newUser._id.toString(),
      recipientEmail: newUser.email,
      recipientName: newUser.firstName,
      title: 'Welcome to Cartiva Mini!',
      message: 'Welcome to Cartiva Mini! Your account has been registered. Start exploring our curated collections.',
      actionUrl: '/shop',
      channels: [NotificationChannel.IN_APP],
    });

    logger.info(
      { userId: newUser._id.toString(), email: newUser.email },
      'Customer registered successfully'
    );

    return {
      user: toSafeUser(newUser),
      message: 'Registration successful! A 6-digit verification code has been dispatched to your email address.',
    };
  }

  /**
   * Authenticate customer with email and password.
   */
  public async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Look up user including password hash and security attributes
    const user = await this.repository.findUserByEmail(normalizedEmail, true);

    // Timing-attack mitigation: compare with dummy hash if user does not exist
    if (!user) {
      await bcrypt.compare(
        dto.password,
        '$2a$12$e80yqZbmKz2BfqhIqM8s3.mQhJ97eWcQ0K6Wd5B7wG3N2UqYjPqGe'
      );
      throw AppError.unauthorized('Invalid email or password.', ErrorCodes.INVALID_CREDENTIALS);
    }

    // Check account active status
    if (!user.isActive) {
      throw AppError.forbidden(
        'This account has been suspended or deactivated. Please contact support.',
        ErrorCodes.ACCOUNT_INACTIVE
      );
    }

    // Check brute force lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      throw AppError.unauthorized(
        `Account is temporarily locked due to consecutive failed attempts. Please try again in ${waitMinutes} minute(s).`,
        ErrorCodes.ACCOUNT_LOCKED
      );
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash ?? '');
    if (!isPasswordValid) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil: Date | undefined;

      if (newFailedAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS) {
        lockUntil = new Date(Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS);
        logger.warn(
          { userId: user._id.toString(), lockUntil },
          'Account locked due to excessive failed attempts'
        );
      }

      await this.repository.recordFailedLogin(user._id.toString(), lockUntil);
      throw AppError.unauthorized('Invalid email or password.', ErrorCodes.INVALID_CREDENTIALS);
    }

    // Enforce email verification policy
    if (!user.isEmailVerified) {
      throw AppError.forbidden(
        'Please verify your email address to log in. Check your inbox for your 6-digit verification code.',
        ErrorCodes.EMAIL_NOT_VERIFIED
      );
    }

    // Reset failed attempts on success
    await this.repository.recordSuccessfulLogin(user._id.toString());

    // Create session and tokens
    const sessionId = crypto.randomUUID();
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user, sessionId);
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_MS);

    await this.repository.createSession({
      userId: user._id.toString(),
      sessionId,
      refreshTokenHash,
      userAgent: userAgent || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
    });

    logger.info(
      { userId: user._id.toString(), sessionId, role: user.role },
      'User authenticated successfully'
    );

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh session and rotate refresh token.
   * Protects against token reuse/replay attacks.
   */
  public async refreshToken(
    rawRefreshToken: string,
    _userAgent?: string,
    _ipAddress?: string
  ): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is required.', ErrorCodes.UNAUTHORIZED);
    }

    const payload = this.verifyRefreshToken(rawRefreshToken);
    const incomingTokenHash = hashToken(rawRefreshToken);

    // Look up session in database
    const session = await this.repository.findSessionByTokenHash(incomingTokenHash);

    // Replay detection: If token signature is valid but not found in active sessions,
    // investigate potential reuse of an already-rotated or revoked token.
    if (!session) {
      const potentiallyRevokedSession = await this.repository.findSessionById(payload.sessionId);
      if (potentiallyRevokedSession) {
        logger.error(
          { userId: payload.sub, sessionId: payload.sessionId },
          'CRITICAL: Refresh token reuse detected! Revoking all user sessions.'
        );
        // Invalidate all sessions for this user immediately
        await this.repository.revokeAllUserSessions(payload.sub);
        await this.repository.updateUser(payload.sub, { $inc: { tokenVersion: 1 } });
      }

      throw AppError.unauthorized(
        'Invalid or expired session. Please log in again.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Verify user exists and token version matches
    const user = await this.repository.findUserById(payload.sub, true);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User account is invalid or inactive.', ErrorCodes.UNAUTHORIZED);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw AppError.unauthorized(
        'Session has been revoked due to security changes. Please log in again.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Rotate refresh token
    const newRefreshToken = this.generateRefreshToken(user, session.sessionId);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_MS);

    await this.repository.rotateSessionToken(session.sessionId, newRefreshTokenHash, newExpiresAt);

    // Generate new access token
    const newAccessToken = this.generateAccessToken(user);

    logger.debug(
      { userId: user._id.toString(), sessionId: session.sessionId },
      'Session refreshed and rotated successfully'
    );

    return {
      user: toSafeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout from current session.
   */
  public async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const tokenHash = hashToken(rawRefreshToken);
      const session = await this.repository.findSessionByTokenHash(tokenHash);
      if (session) {
        await this.repository.revokeSession(session.sessionId);
        logger.info({ sessionId: session.sessionId }, 'Session revoked via logout');
      }
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Error during logout session revocation');
    }
  }

  /**
   * Logout from all devices (revokes all active user sessions).
   */
  public async logoutAll(userId: string): Promise<void> {
    await this.repository.revokeAllUserSessions(userId);
    await this.repository.updateUser(userId, { $inc: { tokenVersion: 1 } });
    logger.info({ userId }, 'All sessions revoked for user');
  }

  /**
   * Retrieve current authenticated user profile.
   */
  public async getMe(userId: string): Promise<SafeUser> {
    const user = await this.repository.findUserById(userId);
    if (!user || !user.isActive) {
      throw AppError.notFound('User profile not found or inactive.', ErrorCodes.USER_NOT_FOUND);
    }
    return toSafeUser(user);
  }

  /**
   * Verify email using 6-digit OTP code.
   */
  public async verifyEmail(
    email: string,
    otp: string,
    purpose: OtpPurpose = 'email_verification'
  ): Promise<{ message: string; userId?: string }> {
    const result = await otpService.verifyOtp(email, otp, purpose);
    return { message: result.message, userId: result.userId };
  }

  /**
   * Resend 6-digit email verification code with cooldown enforcement.
   */
  public async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await otpService.resendOtp(normalizedEmail, 'email_verification');
    return { message: result.message };
  }

  /**
   * Request password reset token.
   */
  public async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.repository.findUserByEmail(normalizedEmail);

    // Prevent user enumeration attacks: always return same message
    if (!user || !user.isActive) {
      return {
        message:
          'If an active account exists with that email, password reset instructions have been sent.',
      };
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(rawResetToken);
    const resetExpires = new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY_MS);

    await this.repository.updateUser(user._id.toString(), {
      $set: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await emailService.sendPasswordResetEmail(user.email, user.firstName, rawResetToken);

    logger.info({ userId: user._id.toString() }, 'Password reset token generated and dispatched');

    return {
      message:
        'If an active account exists with that email, password reset instructions have been sent.',
    };
  }

  /**
   * Reset password with valid reset token.
   */
  public async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.token);
    const user = await this.repository.findUserByResetToken(tokenHash);

    if (!user) {
      throw AppError.badRequest(
        'Password reset link is invalid or has expired. Please request a new one.',
        ErrorCodes.INVALID_TOKEN
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

    // Invalidate reset token, revoke existing sessions, increment tokenVersion
    await this.repository.updateUser(user._id.toString(), {
      $set: { passwordHash },
      $inc: { tokenVersion: 1 },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    });

    await this.repository.revokeAllUserSessions(user._id.toString());
    await emailService.sendPasswordChangedNotification(user.email, user.firstName);
    await notificationService.notify({
      eventType: NotificationType.PASSWORD_CHANGED,
      recipientId: user._id.toString(),
      recipientEmail: user.email,
      recipientName: user.firstName,
      title: 'Security Alert: Password Changed',
      message: 'Your account password was recently changed. All active sessions have been invalidated.',
      actionUrl: '/account/profile',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
    });

    logger.info({ userId: user._id.toString() }, 'Password reset completed successfully');

    return {
      message:
        'Your password has been reset successfully. You may now log in with your new password.',
    };
  }

  /**
   * Authenticated password change.
   */
  public async changePassword(
    userId: string,
    dto: ChangePasswordDto
  ): Promise<{ message: string }> {
    const user = await this.repository.findUserById(userId, true);
    if (!user) {
      throw AppError.notFound('User account not found.', ErrorCodes.USER_NOT_FOUND);
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash ?? '');
    if (!isCurrentValid) {
      throw AppError.badRequest(
        'The current password entered is incorrect.',
        ErrorCodes.INVALID_CREDENTIALS
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw AppError.badRequest(
        'New password cannot be identical to your current password.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

    await this.repository.updateUser(userId, {
      $set: { passwordHash: newPasswordHash },
      $inc: { tokenVersion: 1 },
    });

    // Invalidate all other sessions for security
    await this.repository.revokeAllUserSessions(userId);
    await emailService.sendPasswordChangedNotification(user.email, user.firstName);
    await notificationService.notify({
      eventType: NotificationType.PASSWORD_CHANGED,
      recipientId: userId,
      recipientEmail: user.email,
      recipientName: user.firstName,
      title: 'Security Alert: Password Changed',
      message: 'Your account password was recently changed. All active sessions have been invalidated.',
      actionUrl: '/account/profile',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
    });

    logger.info({ userId }, 'User changed password successfully');

    return { message: 'Password changed successfully. All active sessions have been invalidated.' };
  }

  /**
   * List active sessions for user.
   */
  public async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionDto[]> {
    const sessions = await this.repository.findActiveSessionsByUserId(userId);
    return sessions.map((s) => ({
      id: s.sessionId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.sessionId === currentSessionId,
    }));
  }

  /**
   * Revoke a single session.
   */
  public async revokeUserSession(userId: string, sessionId: string): Promise<{ message: string }> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId.toString() !== userId) {
      throw AppError.notFound(
        'Session not found or already revoked.',
        ErrorCodes.RESOURCE_NOT_FOUND
      );
    }

    await this.repository.revokeSession(sessionId);
    logger.info({ userId, sessionId }, 'Session revoked by user');

    return { message: 'Session revoked successfully.' };
  }
}

export const authService = new AuthService();
