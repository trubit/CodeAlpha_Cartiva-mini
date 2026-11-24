/**
 * Cartiva Mini — Admin Dashboard Aggregation Service
 * Phase 15: Admin Dashboard & Centralized Management System
 * Aggregates real database metrics across orders, payments, products, customers, refunds, and support.
 */
import { Types } from 'mongoose';
import { Order, Payment, Product, User, Refund, SupportTicket, Category } from '../../models/index.js';
import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ProductStatus,
  SupportTicketStatus,
  UserRole,
} from '@shared/enums.js';
import type {
  DashboardSummaryDto,
  DashboardChartsDto,
  DashboardFilterDto,
} from '@shared/api.types.js';

export class DashboardService {
  /**
   * Parse date range from period or explicit ISO date strings.
   */
  private getDateRange(filters?: DashboardFilterDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = filters?.endDate ? new Date(filters.endDate) : new Date(now.setHours(23, 59, 59, 999));
    let startDate: Date;

    if (filters?.startDate) {
      startDate = new Date(filters.startDate);
    } else {
      switch (filters?.period) {
        case 'today': {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case 'yesterday': {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(startDate);
          yesterdayEnd.setHours(23, 59, 59, 999);
          return { startDate, endDate: yesterdayEnd };
        }
        case '7d': {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case 'this_month': {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        }
        case 'last_month': {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          return { startDate, endDate: lastMonthEnd };
        }
        case '30d':
        default: {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
      }
    }

    return { startDate, endDate };
  }

  /**
   * Retrieves high-level business summary KPIs from actual database documents.
   */
  public async getSummary(filters?: DashboardFilterDto): Promise<DashboardSummaryDto> {
    const { startDate, endDate } = this.getDateRange(filters);

    // 1. Revenue Metrics (Verified successful payments within date range)
    const revenueAgg = await Payment.aggregate<{
      _id: null;
      totalMinor: number;
      count: number;
    }>([
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

    const totalRevenueMinor = revenueAgg[0]?.totalMinor || 0;
    const verifiedCount = revenueAgg[0]?.count || 0;

    // 2. Order Status Breakdown
    const orderCounts = await Order.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const orderMap: Record<string, number> = {};
    let totalOrders = 0;
    for (const item of orderCounts) {
      orderMap[item._id] = item.count;
      totalOrders += item.count;
    }

    // 3. Customer Metrics (All time or registered within range)
    const [totalCustomers, activeCustomers] = await Promise.all([
      User.countDocuments({ role: UserRole.CUSTOMER }),
      User.countDocuments({ role: UserRole.CUSTOMER, isActive: true }),
    ]);

    // 4. Product & Stock Metrics
    const [totalProducts, publishedProducts, lowStockCount, outOfStockCount] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: ProductStatus.PUBLISHED }),
      Product.countDocuments({
        $expr: {
          $and: [
            { $gt: ['$stockQuantity', 0] },
            { $lte: ['$stockQuantity', '$lowStockThreshold'] },
          ],
        },
      }),
      Product.countDocuments({ stockQuantity: { $lte: 0 } }),
    ]);

    // 5. Refund Metrics
    const [pendingRefundsCount, refundAgg] = await Promise.all([
      Refund.countDocuments({ status: RefundStatus.PENDING }),
      Refund.aggregate<{ _id: null; totalRefundedMinor: number }>([
        {
          $match: {
            status: RefundStatus.COMPLETED,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRefundedMinor: { $sum: '$amountMinor' },
          },
        },
      ]),
    ]);

    const totalRefundedMinor = refundAgg[0]?.totalRefundedMinor || 0;

    // 6. Support Tickets
    const openTicketsCount = await SupportTicket.countDocuments({
      status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
    });

    return {
      revenue: {
        totalRevenueMinor,
        totalRevenue: Math.round(totalRevenueMinor / 100),
        currency: 'NGN',
        verifiedCount,
      },
      orders: {
        totalOrders,
        pendingPayment: orderMap[OrderStatus.PENDING_PAYMENT] || 0,
        paid: orderMap[OrderStatus.CONFIRMED] || 0,
        processing: orderMap[OrderStatus.PROCESSING] || 0,
        packed: orderMap[OrderStatus.PACKED] || 0,
        readyForShipment: orderMap[OrderStatus.READY_FOR_SHIPMENT] || 0,
        shipped: orderMap[OrderStatus.SHIPPED] || 0,
        outForDelivery: orderMap[OrderStatus.OUT_FOR_DELIVERY] || 0,
        delivered: orderMap[OrderStatus.DELIVERED] || 0,
        cancelled: orderMap[OrderStatus.CANCELLED] || 0,
        failed: (orderMap[OrderStatus.PAYMENT_FAILED] || 0) + (orderMap[OrderStatus.DELIVERY_FAILED] || 0),
      },
      customers: {
        totalCustomers,
        activeCustomers,
      },
      products: {
        totalProducts,
        publishedProducts,
        lowStockCount,
        outOfStockCount,
      },
      refunds: {
        pendingRefundsCount,
        totalRefundedMinor,
        totalRefunded: Math.round(totalRefundedMinor / 100),
      },
      support: {
        openTicketsCount,
      },
    };
  }

  /**
   * Retrieves aggregated chart metrics over time and breakdown distributions.
   */
  public async getCharts(filters?: DashboardFilterDto): Promise<DashboardChartsDto> {
    const { startDate, endDate } = this.getDateRange(filters);

    // 1. Sales & Orders over time (daily aggregation)
    const salesOverTimeAgg = await Order.aggregate<{
      _id: string;
      revenue: number;
      orderCount: number;
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
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesOverTime = salesOverTimeAgg.map((item) => ({
      date: item._id,
      revenue: item.revenue,
      orderCount: item.orderCount,
    }));

    // 2. Order Status Distribution
    const orderStatusAgg = await Order.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const orderStatusDistribution = orderStatusAgg.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    // 3. Payment Status Distribution
    const paymentStatusAgg = await Payment.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const paymentStatusDistribution = paymentStatusAgg.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    // 4. Top Selling Products
    const topProductsAgg = await Order.aggregate<{
      _id: Types.ObjectId;
      unitsSold: number;
      totalRevenue: number;
      title: string;
      sku: string;
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
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          title: { $first: '$items.title' },
          sku: { $first: '$items.sku' },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = topProductsAgg.map((p) => ({
      productId: p._id?.toString() || 'unknown',
      title: p.title || 'Product',
      sku: p.sku || 'N/A',
      unitsSold: p.unitsSold,
      totalRevenue: p.totalRevenue,
    }));

    // 5. Category Performance
    const categoryPerformanceAgg = await Order.aggregate<{
      _id: Types.ObjectId;
      unitsSold: number;
      revenue: number;
      orderCount: number;
    }>([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.SUCCESSFUL] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      {
        $group: {
          _id: '$productDoc.categoryId',
          revenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]);

    // Fetch category names for matched IDs
    const categoryIds = categoryPerformanceAgg.map((c) => c._id).filter(Boolean);
    const categoryDocs = await Category.find({ _id: { $in: categoryIds } }).lean();
    const catNameMap = new Map<string, string>();
    for (const cat of categoryDocs) {
      catNameMap.set(cat._id.toString(), cat.name);
    }

    const categoryPerformance = categoryPerformanceAgg.map((c) => {
      const idStr = c._id?.toString() || 'uncategorized';
      return {
        categoryId: idStr,
        name: catNameMap.get(idStr) || 'General Category',
        revenue: c.revenue,
        orderCount: c.orderCount,
      };
    });

    return {
      salesOverTime,
      orderStatusDistribution,
      paymentStatusDistribution,
      topProducts,
      categoryPerformance,
    };
  }
}

export const dashboardService = new DashboardService();
