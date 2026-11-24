import crypto from 'crypto';
import { Otp, type OtpPurpose } from '../../models/Otp.model.js';
import { User } from '../../models/User.model.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { emailService } from '../../services/email.service.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';

export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
};

export class OtpService {
  /**
   * Generates and dispatches a cryptographically secure 6-digit numeric OTP.
   */
  public async generateAndSendOtp(
    user: { id: string; email: string; firstName: string },
    purpose: OtpPurpose
  ): Promise<{ expiresAt: Date; cooldownSeconds: number }> {
    const normalizedEmail = user.email.toLowerCase().trim();

    // 1. Invalidate any existing unconsumed OTPs for same user and purpose
    await Otp.updateMany(
      { userId: user.id, purpose, consumed: false },
      { $set: { consumed: true } }
    );

    // 2. Generate cryptographically secure 6-digit numeric OTP (000000 - 999999) preserving leading zeros
    const rawOtp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const otpHash = hashOtp(rawOtp);

    const expiryMinutes = env.OTP_EXPIRATION_MINUTES || 30;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const maxAttempts = env.OTP_MAX_ATTEMPTS || 5;

    // 3. Persist hashed OTP to MongoDB
    await Otp.create({
      userId: user.id,
      email: normalizedEmail,
      otpHash,
      purpose,
      expiresAt,
      maxAttempts,
      consumed: false,
    });

    // 4. Dispatch via Email Service (Brevo REST API / SMTP)
    await emailService.sendOtpEmail(
      normalizedEmail,
      user.firstName,
      rawOtp,
      purpose,
      expiryMinutes
    );

    logger.info(
      { userId: user.id, email: normalizedEmail, purpose, expiresAt },
      'OTP generated and dispatched successfully'
    );

    return {
      expiresAt,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS || 60,
    };
  }

  /**
   * Validates a submitted 6-digit numeric OTP.
   */
  public async verifyOtp(
    email: string,
    rawOtp: string,
    purpose: OtpPurpose
  ): Promise<{ success: boolean; userId: string; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = rawOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw AppError.badRequest(
        'Please enter a valid 6-digit numeric verification code.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Look up most recent unconsumed OTP record
    const record = await Otp.findOne({
      email: normalizedEmail,
      purpose,
      consumed: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      throw AppError.badRequest(
        'Invalid or expired verification code. Please request a new code.',
        ErrorCodes.INVALID_OTP
      );
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      await Otp.updateOne({ _id: record._id }, { $set: { consumed: true } });
      throw AppError.badRequest(
        'This verification code has expired. Please request a new one.',
        ErrorCodes.INVALID_OTP
      );
    }

    // Check attempt threshold
    if (record.attempts >= record.maxAttempts) {
      await Otp.updateOne({ _id: record._id }, { $set: { consumed: true } });
      throw AppError.badRequest(
        'Maximum verification attempts exceeded. Please request a new code.',
        ErrorCodes.OTP_ATTEMPTS_EXCEEDED
      );
    }

    // Compare hash
    const submittedHash = hashOtp(cleanOtp);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(record.otpHash, 'hex')
    );

    if (!isMatch) {
      const newAttempts = record.attempts + 1;
      const isExhausted = newAttempts >= record.maxAttempts;

      await Otp.updateOne(
        { _id: record._id },
        {
          $inc: { attempts: 1 },
          ...(isExhausted ? { $set: { consumed: true } } : {}),
        }
      );

      const remainingAttempts = Math.max(0, record.maxAttempts - newAttempts);
      if (remainingAttempts === 0) {
        throw AppError.badRequest(
          'Maximum verification attempts exceeded. This code is no longer valid.',
          ErrorCodes.OTP_ATTEMPTS_EXCEEDED
        );
      }

      throw AppError.badRequest(
        `Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`,
        ErrorCodes.INVALID_OTP
      );
    }

    // Mark OTP consumed
    await Otp.updateOne({ _id: record._id }, { $set: { consumed: true } });

    // Update user state if verifying email
    if (purpose === 'email_verification') {
      await User.findByIdAndUpdate(record.userId, {
        isEmailVerified: true,
        $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
      });

      logger.info(
        { userId: record.userId.toString(), email: normalizedEmail },
        'User email verified successfully via OTP'
      );
    }

    return {
      success: true,
      userId: record.userId.toString(),
      message: 'Verification successful! Your account is active.',
    };
  }

  /**
   * Resends a fresh OTP after enforcing rate limiting and cooldown rules.
   */
  public async resendOtp(
    email: string,
    purpose: OtpPurpose
  ): Promise<{ message: string; cooldownSeconds: number }> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Account enumeration defense
      return {
        message: 'If an account exists with this email address, a verification code has been dispatched.',
        cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS || 60,
      };
    }

    // Check cooldown
    const lastOtp = await Otp.findOne({
      email: normalizedEmail,
      purpose,
    }).sort({ createdAt: -1 });

    const cooldownMs = (env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000;
    if (lastOtp) {
      const elapsedMs = Date.now() - lastOtp.createdAt.getTime();
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw AppError.tooManyRequests(
          `Please wait ${remainingSeconds} second(s) before requesting another code.`,
          ErrorCodes.RATE_LIMIT_EXCEEDED
        );
      }
    }

    // Dispatch new OTP
    await this.generateAndSendOtp(
      { id: user._id.toString(), email: user.email, firstName: user.firstName },
      purpose
    );

    return {
      message: 'A fresh 6-digit verification code has been dispatched to your email address.',
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS || 60,
    };
  }
}

export const otpService = new OtpService();
