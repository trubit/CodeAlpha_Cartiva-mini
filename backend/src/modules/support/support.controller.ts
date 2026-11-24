/**
 * Cartiva Mini — Support Ticket Controller
 * Handles customer tickets and administrative support queues.
 */
import type { Request, Response } from 'express';
import { supportService } from './support.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import type {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '@shared/enums.js';

class SupportController {
  // Customer create ticket
  public async createTicket(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const ticket = await supportService.createTicket(userId, req.body);
    sendSuccess(res, ticket, 'Support ticket submitted successfully.', HttpStatus.CREATED);
  }

  // Customer list their tickets
  public async getMyTickets(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const tickets = await supportService.getCustomerTickets(userId);
    sendSuccess(res, tickets, 'Support tickets retrieved successfully.');
  }

  // View ticket details (Customer or Admin)
  public async getTicketDetail(req: Request, res: Response): Promise<void> {
    const { ticketId } = req.params;
    const requesterId = req.user!.userId;
    const requesterRole = req.user!.role;

    const ticket = await supportService.getTicketById(ticketId!, requesterId, requesterRole);
    sendSuccess(res, ticket, 'Support ticket retrieved successfully.');
  }

  // Add message to ticket
  public async addMessage(req: Request, res: Response): Promise<void> {
    const { ticketId } = req.params;
    const senderId = req.user!.userId;
    const senderRole = req.user!.role;

    const ticket = await supportService.addMessage(ticketId!, senderId, senderRole, req.body);
    sendSuccess(res, ticket, 'Message sent successfully.');
  }

  // Admin list all tickets
  public async listTickets(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as SupportTicketStatus | undefined;
    const priority = req.query.priority as SupportTicketPriority | undefined;
    const category = req.query.category as SupportTicketCategory | undefined;
    const search = req.query.search as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;

    const result = await supportService.listTickets({
      page,
      limit,
      status,
      priority,
      category,
      search,
      assignedTo,
    });

    sendSuccess(res, result, 'Support tickets retrieved successfully.');
  }

  // Admin update status or assign
  public async updateStatus(req: Request, res: Response): Promise<void> {
    const { ticketId } = req.params;
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const ticket = await supportService.updateStatus(ticketId!, req.body, adminId, context);
    sendSuccess(res, ticket, 'Support ticket updated successfully.');
  }
}

export const supportController = new SupportController();
