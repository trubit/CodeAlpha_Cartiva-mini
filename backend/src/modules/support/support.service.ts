/**
 * Cartiva Mini — Customer Support Ticket Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { Types } from 'mongoose';
import { SupportTicket, User, Order, AuditLog, type SupportTicketDocument } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import {
  SupportTicketStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  UserRole,
} from '@shared/enums.js';
import type {
  SupportTicketDto,
  CreateSupportTicketDto,
  AddTicketMessageDto,
  UpdateTicketStatusDto,
  TicketFilterDto,
  PaginatedTicketsDto,
} from '@shared/api.types.js';
import { notificationService } from '../notifications/notification.service.js';
import { NotificationType, NotificationChannel } from '@shared/enums.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

interface PopulatedTicket
  extends Omit<SupportTicketDocument, 'userId' | 'assignedTo' | 'orderId'> {
  userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string };
  assignedTo?: { _id: Types.ObjectId; firstName: string; lastName: string; email: string };
  orderId?: { _id: Types.ObjectId; orderNumber: string };
}

export class SupportService {
  private mapToDto(ticket: SupportTicketDocument | PopulatedTicket): SupportTicketDto {
    const isPopulatedUser =
      typeof ticket.userId === 'object' && ticket.userId !== null && 'firstName' in ticket.userId;
    const isPopulatedStaff =
      typeof ticket.assignedTo === 'object' && ticket.assignedTo !== null && 'firstName' in ticket.assignedTo;
    const isPopulatedOrder =
      typeof ticket.orderId === 'object' && ticket.orderId !== null && 'orderNumber' in ticket.orderId;

    const userIdStr = isPopulatedUser
      ? (ticket.userId as { _id: Types.ObjectId })._id.toString()
      : ticket.userId.toString();

    const customerName = isPopulatedUser
      ? `${(ticket.userId as { firstName: string }).firstName} ${(ticket.userId as { lastName: string }).lastName}`
      : undefined;

    const customerEmail = isPopulatedUser
      ? (ticket.userId as { email: string }).email
      : undefined;

    const assignedToStr = ticket.assignedTo
      ? isPopulatedStaff
        ? (ticket.assignedTo as { _id: Types.ObjectId })._id.toString()
        : ticket.assignedTo.toString()
      : undefined;

    const assignedStaffName = ticket.assignedTo && isPopulatedStaff
      ? `${(ticket.assignedTo as { firstName: string }).firstName} ${(ticket.assignedTo as { lastName: string }).lastName}`
      : undefined;

    const orderIdStr = ticket.orderId
      ? isPopulatedOrder
        ? (ticket.orderId as { _id: Types.ObjectId })._id.toString()
        : ticket.orderId.toString()
      : undefined;

    const orderNumber = ticket.orderId && isPopulatedOrder
      ? (ticket.orderId as { orderNumber: string }).orderNumber
      : undefined;

    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      userId: userIdStr,
      customerName,
      customerEmail,
      orderId: orderIdStr,
      orderNumber,
      subject: ticket.subject,
      category: ticket.category as SupportTicketCategory,
      priority: ticket.priority as SupportTicketPriority,
      status: ticket.status as SupportTicketStatus,
      messages: ticket.messages.map((m) => {
        const msgDoc = m as unknown as {
          _id?: Types.ObjectId;
          senderId: Types.ObjectId;
          senderRole: string;
          content: string;
          attachments?: string[];
          sentAt?: Date;
        };
        return {
          messageId: msgDoc._id?.toString(),
          senderId: msgDoc.senderId.toString(),
          senderRole: msgDoc.senderRole as UserRole,
          content: msgDoc.content,
          attachments: msgDoc.attachments || [],
          sentAt: (msgDoc.sentAt || new Date()).toISOString(),
        };
      }),
      assignedTo: assignedToStr,
      assignedStaffName,
      closedAt: ticket.closedAt?.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  public async listTickets(query: TicketFilterDto): Promise<PaginatedTicketsDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.assignedTo) filter.assignedTo = new Types.ObjectId(query.assignedTo);

    if (query.search) {
      filter.$or = [
        { ticketNumber: { $regex: query.search.trim(), $options: 'i' } },
        { subject: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate<{ userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
          'userId',
          'firstName lastName email'
        )
        .populate<{ assignedTo: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
          'assignedTo',
          'firstName lastName email'
        )
        .populate<{ orderId: { _id: Types.ObjectId; orderNumber: string } }>('orderId', 'orderNumber')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportTicket.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tickets: tickets.map((t) => this.mapToDto(t as unknown as PopulatedTicket)),
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

  public async getCustomerTickets(userId: string): Promise<SupportTicketDto[]> {
    const tickets = await SupportTicket.find({ userId: new Types.ObjectId(userId) })
      .populate<{ orderId: { _id: Types.ObjectId; orderNumber: string } }>('orderId', 'orderNumber')
      .sort({ updatedAt: -1 });

    return tickets.map((t) => this.mapToDto(t as unknown as PopulatedTicket));
  }

  public async getTicketById(
    ticketId: string,
    requesterId?: string,
    requesterRole?: UserRole
  ): Promise<SupportTicketDto> {
    const ticket = await SupportTicket.findById(ticketId)
      .populate<{ userId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
        'userId',
        'firstName lastName email'
      )
      .populate<{ assignedTo: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } }>(
        'assignedTo',
        'firstName lastName email'
      )
      .populate<{ orderId: { _id: Types.ObjectId; orderNumber: string } }>('orderId', 'orderNumber');

    if (!ticket) {
      throw new AppError('Support ticket not found.', HttpStatus.NOT_FOUND, 'TICKET_NOT_FOUND');
    }

    // IDOR check: customers can only view their own tickets
    if (requesterRole === UserRole.CUSTOMER) {
      const ownerId =
        (ticket.userId as unknown as { _id?: Types.ObjectId })._id?.toString() ||
        (ticket.userId as unknown as { toString: () => string }).toString();

      if (ownerId !== requesterId) {
        throw new AppError(
          'You are not authorized to view this support ticket.',
          HttpStatus.FORBIDDEN,
          'FORBIDDEN_RESOURCE'
        );
      }
    }

    return this.mapToDto(ticket as unknown as PopulatedTicket);
  }

  public async createTicket(userId: string, dto: CreateSupportTicketDto): Promise<SupportTicketDto> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
    }

    let orderId: Types.ObjectId | undefined;
    if (dto.orderId) {
      const order = await Order.findOne({
        _id: new Types.ObjectId(dto.orderId),
        userId: new Types.ObjectId(userId),
      });
      if (order) {
        orderId = order._id;
      }
    }

    // Generate readable ticket number: TKT-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${dateStr}-${randSuffix}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      userId: new Types.ObjectId(userId),
      orderId,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority || SupportTicketPriority.MEDIUM,
      status: SupportTicketStatus.OPEN,
      messages: [
        {
          senderId: new Types.ObjectId(userId),
          senderRole: UserRole.CUSTOMER,
          content: dto.message,
          attachments: [],
          sentAt: new Date(),
        },
      ],
    });

    return this.mapToDto(ticket);
  }

  public async addMessage(
    ticketId: string,
    senderId: string,
    senderRole: UserRole,
    dto: AddTicketMessageDto
  ): Promise<SupportTicketDto> {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', HttpStatus.NOT_FOUND, 'TICKET_NOT_FOUND');
    }

    // IDOR protection for customers
    if (senderRole === UserRole.CUSTOMER && ticket.userId.toString() !== senderId) {
      throw new AppError('Access denied.', HttpStatus.FORBIDDEN, 'FORBIDDEN_RESOURCE');
    }

    ticket.messages.push({
      senderId: new Types.ObjectId(senderId),
      senderRole,
      content: dto.content,
      attachments: dto.attachments || [],
      sentAt: new Date(),
    } as unknown as (typeof ticket.messages)[0]);

    // Update ticket status based on sender
    if (senderRole === UserRole.CUSTOMER) {
      ticket.status = SupportTicketStatus.OPEN;
    } else {
      ticket.status = SupportTicketStatus.WAITING_ON_CUSTOMER;
    }

    await ticket.save();

    // If staff/admin replied, dispatch notification to customer
    if (senderRole !== UserRole.CUSTOMER) {
      notificationService
        .notify({
          eventType: NotificationType.SUPPORT_RESPONSE,
          recipientId: ticket.userId.toString(),
          title: `Support Reply — Ticket #${ticket.ticketNumber}`,
          message: `Our support team replied to your ticket #${ticket.ticketNumber}: "${dto.content.substring(0, 100)}..."`,
          actionUrl: `/support/tickets/${ticket._id.toString()}`,
          templateContext: {
            ticketNumber: ticket.ticketNumber,
            ticketSubject: ticket.subject,
            replyMessage: dto.content,
            actionUrl: `${env.FRONTEND_URL}/support/tickets/${ticket._id.toString()}`,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })
        .catch((err) => {
          logger.error(
            { error: (err as Error).message, ticketNumber: ticket.ticketNumber },
            'Failed to dispatch support reply notification'
          );
        });
    }

    return this.getTicketById(ticketId);
  }

  public async updateStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<SupportTicketDto> {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', HttpStatus.NOT_FOUND, 'TICKET_NOT_FOUND');
    }

    const prevStatus = ticket.status;
    const prevAssigned = ticket.assignedTo?.toString();

    if (dto.status) {
      ticket.status = dto.status;
      if (dto.status === SupportTicketStatus.RESOLVED || dto.status === SupportTicketStatus.CLOSED) {
        ticket.closedAt = new Date();
      } else {
        ticket.closedAt = undefined;
      }
    }

    if (dto.priority) {
      ticket.priority = dto.priority;
    }

    if (dto.assignedTo) {
      ticket.assignedTo = new Types.ObjectId(dto.assignedTo);
    }

    await ticket.save();

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'TICKET_STATUS_UPDATED',
        entity: 'SupportTicket',
        entityId: ticket._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: {
          before: { status: prevStatus, assignedTo: prevAssigned },
          after: { status: ticket.status, assignedTo: ticket.assignedTo?.toString() },
        },
      });
    }

    return this.getTicketById(ticketId);
  }
}

export const supportService = new SupportService();
