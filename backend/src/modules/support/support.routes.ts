/**
 * Cartiva Mini — Customer Support Ticket Routes
 * Mounted at /api/v1/support
 */
import { Router } from 'express';
import { supportController } from './support.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { createSupportTicketSchema, addTicketMessageSchema } from './support.validator.js';

export const supportRouter = Router();

// All customer support operations require authentication
supportRouter.use(authenticate);

supportRouter.get(
  '/tickets',
  asyncHandler((req, res) => supportController.getMyTickets(req, res))
);

supportRouter.post(
  '/tickets',
  validateRequest({ body: createSupportTicketSchema }),
  asyncHandler((req, res) => supportController.createTicket(req, res))
);

supportRouter.get(
  '/tickets/:ticketId',
  asyncHandler((req, res) => supportController.getTicketDetail(req, res))
);

supportRouter.post(
  '/tickets/:ticketId/messages',
  validateRequest({ body: addTicketMessageSchema }),
  asyncHandler((req, res) => supportController.addMessage(req, res))
);
