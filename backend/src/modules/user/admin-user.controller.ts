import type { Request, Response } from 'express';
import { userService } from './user.service.js';
import { sendSuccess } from '../../utils/response.util.js';

class AdminUserController {
  public async getUsers(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const deletionStatus = req.query.deletionStatus as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const result = await userService.adminListUsers({
      page,
      limit,
      search,
      role,
      isActive,
      deletionStatus,
    });

    sendSuccess(res, result, 'Customer accounts retrieved successfully.');
  }

  public async getUserDetail(req: Request, res: Response): Promise<void> {
    const userId = req.params.userId!;
    const detail = await userService.adminGetUserDetail(userId);
    sendSuccess(res, detail, 'Customer account details retrieved successfully.');
  }

  public async updateUserStatus(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const userId = req.params.userId!;
    const { isActive, reason } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const updated = await userService.adminUpdateUserStatus(
      adminId,
      userId,
      isActive,
      reason,
      context
    );

    sendSuccess(res, updated, 'Customer account status updated successfully.');
  }

  public async listStaff(_req: Request, res: Response): Promise<void> {
    const staff = await userService.adminListStaff();
    sendSuccess(res, staff, 'Staff and administrator accounts retrieved successfully.');
  }

  public async createStaff(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const newStaff = await userService.adminCreateStaff(adminId, req.body, context);
    sendSuccess(res, newStaff, 'Staff account created successfully.');
  }

  public async updateStaffRole(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const userId = req.params.userId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const updated = await userService.adminUpdateStaffRole(adminId, userId, req.body, context);
    sendSuccess(res, updated, 'Staff role updated successfully.');
  }

  public async reviewDeletionRequest(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const userId = req.params.userId!;
    const { deletionStatus, reason } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const updated = await userService.adminReviewDeletionRequest(
      adminId,
      userId,
      deletionStatus,
      reason,
      context
    );
    sendSuccess(res, updated, `Deletion request marked as ${deletionStatus}.`);
  }
}


export const adminUserController = new AdminUserController();
