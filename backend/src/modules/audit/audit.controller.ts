/**
 * Cartiva Mini — Audit Log Controller
 */
import type { Request, Response } from 'express';
import { auditService } from './audit.service.js';
import { sendSuccess } from '../../utils/response.util.js';

class AuditController {
  public async listLogs(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const actorId = req.query.actorId as string | undefined;
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await auditService.listLogs({
      page,
      limit,
      actorId,
      entity,
      action,
      startDate,
      endDate,
      search,
    });

    sendSuccess(
      res,
      result.logs,
      'Audit logs retrieved successfully.',
      200,
      result.pagination
    );
  }
}

export const auditController = new AuditController();
