import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { UserRole } from '@shared/enums.js';
import { authService } from '../modules/auth/auth.service.js';
import { User } from '../models/User.model.js';

/**
 * Authentication Guard Middleware.
 * Verifies Bearer JWT access token from Authorization header and attaches authenticated user context.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Authentication credentials are required. Please provide a valid Bearer token.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized(
        'Malformed Authorization header. Token is missing.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Verify signature and expiration
    const payload = authService.verifyAccessToken(token);

    // Verify user exists and status in database
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user) {
      throw AppError.unauthorized('User account does not exist.', ErrorCodes.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw AppError.forbidden(
        'Your account has been deactivated or suspended.',
        ErrorCodes.ACCOUNT_INACTIVE
      );
    }

    // Defense-in-depth: Verify tokenVersion matches current user tokenVersion
    if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
      throw AppError.unauthorized(
        'Authentication session has been revoked due to recent security updates. Please log in again.',
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Attach strongly typed authenticated user context to request
    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion ?? 0,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Guard Middleware.
 * Rejects requests if authenticated user does not have at least one of the required roles.
 */
export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.', ErrorCodes.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          'Access denied. You do not possess the required permissions to perform this operation.',
          ErrorCodes.FORBIDDEN
        )
      );
    }

    next();
  };
};

/**
 * Verified Email Guard Middleware.
 * Enforces that user has confirmed their email address before accessing specific endpoints.
 */
export const requireEmailVerified: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required.', ErrorCodes.UNAUTHORIZED));
  }

  if (!req.user.isEmailVerified) {
    return next(
      AppError.forbidden(
        'Please verify your email address to access this feature.',
        ErrorCodes.EMAIL_NOT_VERIFIED
      )
    );
  }

  next();
};

/**
 * Optional Authentication Middleware.
 * Attaches req.user if a valid token is provided, but continues without error if unauthenticated.
 */
export const optionalAuthenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const payload = authService.verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (user && user.isActive && (user.tokenVersion ?? 0) === payload.tokenVersion) {
      req.user = {
        id: user._id.toString(),
        userId: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        tokenVersion: user.tokenVersion ?? 0,
      };
    }
  } catch {
    // Ignore invalid optional tokens
  }

  next();
};
