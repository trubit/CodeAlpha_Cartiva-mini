/**
 * Cartiva Mini — Administrator Support Ticket Routes
 * Mounted at /api/v1/admin/support
 */
import { Router } from 'express';
import { supportController } from './support.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { addTicketMessageSchema, updateTicketStatusSchema } from './support.validator.js';
import { UserRole } from '@shared/enums.js';

export const adminSupportRouter = Router();

// Guarded by authentication and Admin/Staff role
adminSupportRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminSupportRouter.get(
  '/tickets',
  asyncHandler((req, res) => supportController.listTickets(req, res))
);

adminSupportRouter.get(
  '/tickets/:ticketId',
  asyncHandler((req, res) => supportController.getTicketDetail(req, res))
);

adminSupportRouter.post(
  '/tickets/:ticketId/messages',
  validateRequest({ body: addTicketMessageSchema }),
  asyncHandler((req, res) => supportController.addMessage(req, res))
);

adminSupportRouter.patch(
  '/tickets/:ticketId/status',
  validateRequest({ body: updateTicketStatusSchema }),
  asyncHandler((req, res) => supportController.updateStatus(req, res))
);
