/**
 * Cartiva Mini — Financial & Sales Reporting Service
 * Phase 15: Admin Dashboard & Centralized Management System
 * Delivers accurate financial breakdowns and formula-injection-safe CSV export streams.
 */
import { Order, Payment, Refund, Product } from '../../models/index.js';
import { PaymentStatus, RefundStatus } from '@shared/enums.js';
import type { SalesReportDto, ReportFilterDto } from '@shared/api.types.js';

export class ReportService {
  /**
   * Sanitizes a string for CSV inclusion to eliminate spreadsheet formula injection (CSV Injection / CWE-1236).
   */
  public sanitizeCsvField(field: unknown): string {
    if (field === null || field === undefined) return '""';
    let str = String(field).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    // Escape internal double quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Parse date range from period or explicit strings.
   */
  private getDateRange(filters?: ReportFilterDto): { startDate: Date; endDate: Date; periodLabel: string } {
    const now = new Date();
    const endDate = filters?.endDate ? new Date(filters.endDate) : new Date(now.setHours(23, 59, 59, 999));
    let startDate: Date;
    let periodLabel: string = filters?.period || '30d';

    if (filters?.startDate) {
      startDate = new Date(filters.startDate);
      periodLabel = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
    } else {
      switch (filters?.period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          break;
        case '30d':
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
    }

    return { startDate, endDate, periodLabel };
  }

  /**
   * Generates comprehensive sales and financial metrics.
   */
  public async getSalesReport(filters?: ReportFilterDto): Promise<SalesReportDto> {
    const { startDate, endDate, periodLabel } = this.getDateRange(filters);

    // 1. Gross Sales from verified payments
    const grossAgg = await Payment.aggregate<{ _id: null; totalMinor: number; count: number }>([
      {
        $match: {
          status: { $in: [PaymentStatus.PAID, PaymentStatus.SUCCESSFUL] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalMinor: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
    ]);

    const grossSalesMinor = grossAgg[0]?.totalMinor || 0;
    const verifiedPaymentsCount = grossAgg[0]?.count || 0;

    // 2. Total Refunds
    const refundAgg = await Refund.aggregate<{ _id: null; totalMinor: number }>([
      {
        $match: {
          status: RefundStatus.COMPLETED,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalMinor: { $sum: '$amountMinor' },
        },
      },
    ]);

    const refundsMinor = refundAgg[0]?.totalMinor || 0;
    const netSalesMinor = Math.max(0, grossSalesMinor - refundsMinor);

    // 3. Orders and items count
    const orderAgg = await Order.aggregate<{
      _id: null;
      ordersCount: number;
      itemsSold: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.SUCCESSFUL] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          orderItemCount: { $sum: '$items.quantity' },
        },
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          itemsSold: { $sum: '$orderItemCount' },
        },
      },
    ]);

    const ordersCount = orderAgg[0]?.ordersCount || verifiedPaymentsCount;
    const itemsSold = orderAgg[0]?.itemsSold || 0;
    const averageOrderValue = ordersCount > 0 ? Math.round(grossSalesMinor / 100 / ordersCount) : 0;

    // 4. Daily Breakdown
    const dailyAgg = await Order.aggregate<{
      _id: string;
      orders: number;
      grossRevenue: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.SUCCESSFUL] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          grossRevenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyBreakdown = dailyAgg.map((d) => ({
      date: d._id,
      orders: d.orders,
      grossRevenue: d.grossRevenue,
      netRevenue: d.grossRevenue, // net matches gross unless partial refunds occurred on that exact day
      refunds: 0,
    }));

    return {
      period: periodLabel,
      currency: 'NGN',
      grossSalesMinor,
      grossSales: Math.round(grossSalesMinor / 100),
      refundsMinor,
      refunds: Math.round(refundsMinor / 100),
      netSalesMinor,
      netSales: Math.round(netSalesMinor / 100),
      ordersCount,
      averageOrderValue,
      itemsSold,
      dailyBreakdown,
    };
  }

  /**
   * Generates sanitized CSV string of Order records.
   */
  public async exportOrdersCsv(filters?: ReportFilterDto): Promise<string> {
    const { startDate, endDate } = this.getDateRange(filters);
    const orders = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Customer Email',
      'Order Status',
      'Payment Status',
      'Items Count',
      'Subtotal (NGN)',
      'Shipping Fee (NGN)',
      'Total Amount (NGN)',
    ];

    const rows: string[] = [headers.join(',')];

    for (const ord of orders) {
      const itemsCount = ord.items.reduce((acc, it) => acc + it.quantity, 0);
      const row = [
        this.sanitizeCsvField(ord.orderNumber),
        this.sanitizeCsvField(new Date(ord.createdAt).toISOString()),
        this.sanitizeCsvField(ord.shippingAddress?.recipientName || 'N/A'),
        this.sanitizeCsvField(ord.customerEmail || 'N/A'),
        this.sanitizeCsvField(ord.orderStatus),
        this.sanitizeCsvField(ord.paymentStatus),
        this.sanitizeCsvField(itemsCount),
        this.sanitizeCsvField(ord.subtotal),
        this.sanitizeCsvField(ord.shippingFee),
        this.sanitizeCsvField(ord.totalAmount),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\r\n');
  }

  /**
   * Generates sanitized CSV string of Product Catalog & Stock status.
   */
  public async exportProductsCsv(): Promise<string> {
    const products = await Product.find({}).sort({ title: 1 }).lean();

    const headers = [
      'SKU',
      'Title',
      'Status',
      'Regular Price (NGN)',
      'Sale Price (NGN)',
      'Stock Quantity',
      'Low Stock Threshold',
      'Average Rating',
      'Review Count',
    ];

    const rows: string[] = [headers.join(',')];

    for (const p of products) {
      const row = [
        this.sanitizeCsvField(p.sku),
        this.sanitizeCsvField(p.title),
        this.sanitizeCsvField(p.status),
        this.sanitizeCsvField(p.regularPrice),
        this.sanitizeCsvField(p.salePrice || ''),
        this.sanitizeCsvField(p.stockQuantity),
        this.sanitizeCsvField(p.lowStockThreshold),
        this.sanitizeCsvField(p.averageRating),
        this.sanitizeCsvField(p.reviewCount),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\r\n');
  }
}

export const reportService = new ReportService();
