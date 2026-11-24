import type { Request, Response } from 'express';
import { userService } from './user.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { AUTH_CONSTANTS, CLEAR_REFRESH_COOKIE_OPTIONS } from '../auth/auth.constants.js';

class UserController {
  // ==========================================================================
  // 1. Profile Management
  // ==========================================================================

  public async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const profile = await userService.getProfile(userId);
    sendSuccess(res, profile, 'Customer profile retrieved successfully.');
  }

  public async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const updatedUser = await userService.updateProfile(userId, req.body);
    sendSuccess(res, updatedUser, 'Profile information updated successfully.');
  }

  // ==========================================================================
  // 2. Avatar Management
  // ==========================================================================

  public async uploadAvatar(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw AppError.badRequest(
        'Please provide an image file to upload as your avatar.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const userId = req.user!.userId;
    const result = await userService.uploadAvatar(userId, req.file.buffer, req.file.mimetype);
    sendSuccess(res, result, 'Avatar uploaded and profile updated successfully.');
  }

  public async deleteAvatar(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await userService.deleteAvatar(userId);
    sendSuccess(res, null, result.message);
  }

  // ==========================================================================
  // 3. Address Management
  // ==========================================================================

  public async getAddresses(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const addresses = await userService.getUserAddresses(userId);
    sendSuccess(res, addresses, 'Saved delivery addresses retrieved successfully.');
  }

  public async createAddress(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const address = await userService.createAddress(userId, req.body);
    sendCreated(res, address, 'Delivery address saved successfully.');
  }

  public async updateAddress(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const addressId = req.params.addressId!;
    const address = await userService.updateAddress(userId, addressId, req.body);
    sendSuccess(res, address, 'Delivery address updated successfully.');
  }

  public async deleteAddress(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const addressId = req.params.addressId!;
    const result = await userService.deleteAddress(userId, addressId);
    sendSuccess(res, null, result.message);
  }

  public async setDefaultAddress(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const addressId = req.params.addressId!;
    const address = await userService.setDefaultAddress(userId, addressId);
    sendSuccess(res, address, 'Default delivery address updated successfully.');
  }

  // ==========================================================================
  // 4. Email Change Workflow
  // ==========================================================================

  public async requestEmailChange(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const currentEmail = req.user!.email;
    const { newEmail } = req.body;
    const result = await userService.requestEmailChange(userId, currentEmail, newEmail);
    sendSuccess(res, null, result.message);
  }

  public async verifyEmailChange(req: Request, res: Response): Promise<void> {
    const { token } = req.body;
    const updatedUser = await userService.verifyEmailChange(token);
    // Clear refresh cookie since all existing sessions were invalidated
    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, CLEAR_REFRESH_COOKIE_OPTIONS);
    sendSuccess(
      res,
      updatedUser,
      'Email address successfully verified and updated. Please log in with your new email.'
    );
  }

  public async resendEmailChange(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await userService.resendEmailChange(userId);
    sendSuccess(res, null, result.message);
  }

  // ==========================================================================
  // 5. Account Deactivation & Deletion
  // ==========================================================================

  public async requestDeactivation(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { password, reason } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const result = await userService.requestDeactivation(userId, password, reason, context);

    // Clear session cookie
    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, CLEAR_REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, null, result.message);
  }

  public async requestDeletion(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { password, reason } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const result = await userService.requestDeletion(userId, password, reason, context);
    sendSuccess(res, null, result.message);
  }

  public async getDeletionStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const status = await userService.getDeletionStatus(userId);
    sendSuccess(res, status, 'Account deletion status retrieved successfully.');
  }

  // ==========================================================================
  // 6. Dashboard Summary
  // ==========================================================================

  public async getDashboardSummary(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const summary = await userService.getDashboardSummary(userId);
    sendSuccess(res, summary, 'Customer account dashboard overview retrieved successfully.');
  }
}

export const userController = new UserController();
