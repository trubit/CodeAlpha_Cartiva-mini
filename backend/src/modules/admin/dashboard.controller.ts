/**
 * Cartiva Mini — Admin Dashboard Controller
 * Handles administrative overview statistics and charts requests.
 */
import type { Request, Response } from 'express';
import { dashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import type { DashboardFilterDto } from '@shared/api.types.js';

class DashboardController {
  public async getSummary(req: Request, res: Response): Promise<void> {
    const filters: DashboardFilterDto = {
      period: req.query.period as DashboardFilterDto['period'],
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const summary = await dashboardService.getSummary(filters);
    sendSuccess(res, summary, 'Dashboard business summary retrieved successfully.');
  }

  public async getCharts(req: Request, res: Response): Promise<void> {
    const filters: DashboardFilterDto = {
      period: req.query.period as DashboardFilterDto['period'],
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const charts = await dashboardService.getCharts(filters);
    sendSuccess(res, charts, 'Dashboard analytics charts retrieved successfully.');
  }
}

export const dashboardController = new DashboardController();
