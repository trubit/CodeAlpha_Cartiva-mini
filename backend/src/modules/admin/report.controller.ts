/**
 * Cartiva Mini — Admin Report Controller
 * Delivers financial sales reports and CSV streams.
 */
import type { Request, Response } from 'express';
import { reportService } from './report.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import type { ReportFilterDto } from '@shared/api.types.js';

class ReportController {
  public async getSalesReport(req: Request, res: Response): Promise<void> {
    const filters: ReportFilterDto = {
      period: req.query.period as ReportFilterDto['period'],
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const report = await reportService.getSalesReport(filters);
    sendSuccess(res, report, 'Financial sales report generated successfully.');
  }

  public async exportOrdersCsv(req: Request, res: Response): Promise<void> {
    const filters: ReportFilterDto = {
      period: req.query.period as ReportFilterDto['period'],
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const csvData = await reportService.exportOrdersCsv(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-report-${Date.now()}.csv"`);
    res.status(200).send(csvData);
  }

  public async exportProductsCsv(_req: Request, res: Response): Promise<void> {
    const csvData = await reportService.exportProductsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-catalog-${Date.now()}.csv"`);
    res.status(200).send(csvData);
  }
}

export const reportController = new ReportController();
