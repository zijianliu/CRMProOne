import { Router } from 'express';
import { body } from 'express-validator';
import * as ticketController from '../controllers/ticketController';
import { TicketStatus, TicketPriority } from '../types';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

const validStatuses = Object.values(TicketStatus);
const validPriorities = Object.values(TicketPriority);

router.post(
  '/',
  authMiddleware,
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').isString().optional(),
    body('assignee').isString().optional(),
    body('priority')
      .isIn(validPriorities)
      .withMessage(`Priority must be one of: ${validPriorities.join(', ')}`)
  ],
  ticketController.createTicket
);

router.get('/', authMiddleware, ticketController.getTickets);

router.get('/statistics', optionalAuthMiddleware, ticketController.getStatistics);

router.get('/assignees', optionalAuthMiddleware, ticketController.getAllAssignees);

router.get('/attachments/config', ticketController.getAttachmentConfig);

router.get('/:id', authMiddleware, ticketController.getTicketById);

router.put(
  '/:id/status',
  authMiddleware,
  [
    body('status')
      .isIn(validStatuses)
      .withMessage(`Status must be one of: ${validStatuses.join(', ')}`)
  ],
  ticketController.updateTicketStatus
);

router.put(
  '/:id/assignee',
  authMiddleware,
  ticketController.updateTicketAssignee
);

router.post(
  '/:id/comments',
  authMiddleware,
  [
    body('content').isString().notEmpty().withMessage('Content is required')
  ],
  ticketController.addComment
);

router.get('/:id/comments', authMiddleware, ticketController.getTicketComments);

router.get('/:id/logs', authMiddleware, ticketController.getActionLogs);

router.post('/:id/attachments', authMiddleware, ticketController.uploadAttachment);

router.get('/:id/attachments', authMiddleware, ticketController.getAttachments);

router.get('/attachments/:attachmentId/download', ticketController.downloadAttachment);

export default router;
