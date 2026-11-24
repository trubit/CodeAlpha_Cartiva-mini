/**
 * Cartiva Mini — Audit Log Query Service
 * Phase 15: Admin Dashboard & Centralized Management System
 * Read-only interface for inspecting the immutable administrative audit ledger.
 */
import { Types } from 'mongoose';
import { AuditLog, type AuditLogDocument } from '../../models/index.js';
import type {
  AuditLogItemDto,
  AuditFilterDto,
  PaginatedAuditLogsDto,
} from '@shared/api.types.js';

interface PopulatedAuditLog extends Omit<AuditLogDocument, 'actorId'> {
  actorId?: { _id: Types.ObjectId; firstName: string; lastName: string; email: string };
}

export class AuditService {
  private mapToDto(log: AuditLogDocument | PopulatedAuditLog): AuditLogItemDto {
    const isPopulated =
      typeof log.actorId === 'object' && log.actorId !== null && 'firstName' in log.actorId;

    const actorIdStr = log.actorId
      ? isPopulated
        ? (log.actorId as { _id: Types.ObjectId })._id.toString()
        : log.actorId.toString()
      : undefined;

    const actorName = log.actorId && isPopulated
      ? `${(log.actorId as { firstName: string }).firstName} ${(log.actorId as { lastName: string }).lastName}`
      : undefined;

    const actorEmail = log.actorId && isPopulated
      ? (log.actorId as { email: string }).email
      : undefined;

    return {
      id: log._id.toString(),
      actorId: actorIdStr,
      actorName,
      actorEmail,
      actorRole: log.actorRole,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      changesDiff: log.changesDiff as AuditLogItemDto['changesDiff'],
      timestamp: log.timestamp.toISOString(),
    };
  }

  public async listLogs(query: AuditFilterDto): Promise<PaginatedAuditLogsDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.actorId) {
      filter.actorId = new Types.ObjectId(query.actorId);
    }

    if (query.entity) {
      filter.entity = query.entity.trim();
    }

    if (query.action) {
      filter.action = query.action.trim();
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        (filter.timestamp as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.timestamp as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      filter.$or = [
        { action: { $regex: query.search.trim(), $options: 'i' } },
        { entity: { $regex: query.search.trim(), $options: 'i' } },
        { entityId: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate<{ actorId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
          'actorId',
          'firstName lastName email'
        )
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs: logs.map((l) => this.mapToDto(l as unknown as PopulatedAuditLog)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

export const auditService = new AuditService();
