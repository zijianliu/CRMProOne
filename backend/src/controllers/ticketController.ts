import { Response } from 'express';
import { validationResult } from 'express-validator';
import * as ticketService from '../services/ticketService';
import * as actionLogService from '../services/actionLogService';
import * as attachmentService from '../services/attachmentService';
import * as notificationService from '../services/notificationService';
import * as slaService from '../services/slaService';
import * as userService from '../services/userService';
import { 
  TicketStatus, 
  TicketPriority, 
  STATUS_TRANSITIONS, 
  MAX_ATTACHMENT_SIZE, 
  MAX_ATTACHMENTS_PER_TICKET, 
  ALLOWED_ATTACHMENT_EXTENSIONS,
  NotificationType,
  Ticket,
  getStatusChangeDescription,
  getAssigneeChangeDescription
} from '../types';
import { 
  AuthenticatedRequest,
  canViewTicket,
  canUpdateTicketStatus,
  canUpdateTicketAssignee,
  canAddComment,
  canCreateTicket,
  getTicketFilterForUser,
  isAdmin
} from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, submitter, assignee, priority } = req.body;

    const currentUser = req.currentUser;
    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    if (!canCreateTicket(currentUser)) {
      res.status(403).json({ error: '您没有权限创建工单' });
      return;
    }

    const ticket = await ticketService.createTicket(
      title,
      description,
      currentUser.username,
      assignee || null,
      priority
    );

    if (assignee) {
      const { title, content } = notificationService.generateNotificationContent(
        NotificationType.TICKET_ASSIGNED,
        ticket
      );
      await notificationService.createNotification(
        assignee,
        ticket.id,
        NotificationType.TICKET_ASSIGNED,
        title,
        content
      );
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const getTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      status, 
      priority, 
      search,
      assignee,
      myAssignee,
      startDate,
      endDate
    } = req.query;

    const currentUser = req.currentUser;

    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const parsedPageSize = Math.max(1, Math.min(50, parseInt(pageSize as string, 10) || 10));

    const result = await ticketService.getTickets(
      parsedPage,
      parsedPageSize,
      status as TicketStatus,
      priority as TicketPriority,
      search as string,
      assignee as string,
      myAssignee as string,
      startDate as string,
      endDate as string
    );

    let filteredData = result.data;
    
    if (currentUser) {
      filteredData = result.data.filter(ticket => canViewTicket(currentUser, ticket));
    } else {
      filteredData = [];
    }

    const dataWithSLA = filteredData.map(ticket => ({
      ...ticket,
      slaInfo: slaService.getSLAInfo(ticket)
    }));

    res.json({
      ...result,
      data: dataWithSLA,
      total: dataWithSLA.length
    });
  } catch (error) {
    console.error('Error getting tickets:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
};

export const getTicketById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const ticket = await ticketService.getTicketById(id);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canViewTicket(currentUser, ticket)) {
      res.status(403).json({ error: '您没有权限查看此工单' });
      return;
    }

    const slaInfo = slaService.getSLAInfo(ticket);
    res.json({
      ...ticket,
      slaInfo
    });
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
};

export const updateTicketStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canUpdateTicketStatus(currentUser, existingTicket)) {
      res.status(403).json({ error: '您没有权限修改此工单的状态' });
      return;
    }

    try {
      const ticket = await ticketService.updateTicketStatus(id, status, currentUser.username);
      
      const statusChangeDesc = getStatusChangeDescription(existingTicket.status, status);
      const { title, content } = notificationService.generateNotificationContent(
        NotificationType.STATUS_CHANGED,
        ticket,
        currentUser.username,
        statusChangeDesc
      );

      const notifyUsers: string[] = [];
      if (ticket.submitter && ticket.submitter !== currentUser.username) {
        notifyUsers.push(ticket.submitter);
      }
      if (ticket.assignee && ticket.assignee !== currentUser.username) {
        notifyUsers.push(ticket.assignee);
      }

      for (const userId of notifyUsers) {
        await notificationService.createNotification(
          userId,
          ticket.id,
          NotificationType.STATUS_CHANGED,
          title,
          content
        );
      }

      const slaInfo = slaService.getSLAInfo(ticket);
      res.json({
        ...ticket,
        slaInfo
      });
    } catch (statusError: any) {
      res.status(400).json({ 
        error: statusError.message,
        allowedTransitions: STATUS_TRANSITIONS[existingTicket.status] || []
      });
    }
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
};

export const updateTicketAssignee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { assignee } = req.body;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canUpdateTicketAssignee(currentUser)) {
      res.status(403).json({ error: '只有管理员可以分配处理人' });
      return;
    }

    const ticket = await ticketService.updateTicketAssignee(id, assignee, currentUser.username);
    
    if (assignee && assignee !== existingTicket.assignee) {
      const { title, content } = notificationService.generateNotificationContent(
        NotificationType.TICKET_ASSIGNED,
        ticket
      );
      await notificationService.createNotification(
        assignee,
        ticket.id,
        NotificationType.TICKET_ASSIGNED,
        title,
        content
      );
    }

    const slaInfo = slaService.getSLAInfo(ticket);
    res.json({
      ...ticket,
      slaInfo
    });
  } catch (error) {
    console.error('Error updating ticket assignee:', error);
    res.status(500).json({ error: 'Failed to update ticket assignee' });
  }
};

export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { content } = req.body;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canAddComment(currentUser, existingTicket)) {
      res.status(403).json({ error: '您没有权限添加备注到此工单' });
      return;
    }

    const comment = await ticketService.addComment(id, content, currentUser.username);
    
    const { title, content: notifyContent } = notificationService.generateNotificationContent(
      NotificationType.COMMENT_ADDED,
      existingTicket,
      currentUser.username
    );

    const notifyUsers: string[] = [];
    if (existingTicket.submitter && existingTicket.submitter !== currentUser.username) {
      notifyUsers.push(existingTicket.submitter);
    }
    if (existingTicket.assignee && existingTicket.assignee !== currentUser.username) {
      notifyUsers.push(existingTicket.assignee);
    }

    for (const userId of notifyUsers) {
      await notificationService.createNotification(
        userId,
        existingTicket.id,
        NotificationType.COMMENT_ADDED,
        title,
        notifyContent
      );
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const getTicketComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canViewTicket(currentUser, existingTicket)) {
      res.status(403).json({ error: '您没有权限查看此工单的备注' });
      return;
    }

    const comments = await ticketService.getCommentsByTicketId(id);

    res.json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

export const getActionLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.currentUser;

    if (!currentUser) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (!canViewTicket(currentUser, existingTicket)) {
      res.status(403).json({ error: '您没有权限查看此工单的操作日志' });
      return;
    }

    const logs = await actionLogService.getActionLogsByTicketId(id);

    res.json(logs);
  } catch (error) {
    console.error('Error getting action logs:', error);
    res.status(500).json({ error: 'Failed to get action logs' });
  }
};

export const getStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { myAssignee } = req.query;
    const statistics = await ticketService.getStatistics(myAssignee as string);
    res.json(statistics);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

export const getAllAssignees = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignees = await ticketService.getAllAssignees();
    res.json(assignees);
  } catch (error) {
    console.error('Error getting assignees:', error);
    res.status(500).json({ error: 'Failed to get assignees' });
  }
};

export const getHandlerUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const handlers = await userService.getHandlers();
    res.json(handlers);
  } catch (error) {
    console.error('Error getting handlers:', error);
    res.status(500).json({ error: 'Failed to get handlers' });
  }
};

export const uploadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { originalName, mimeType, fileData, uploadedBy } = req.body;

    if (!fileData) {
      res.status(400).json({ error: '文件数据不能为空' });
      return;
    }

    if (!uploadedBy) {
      res.status(400).json({ error: '上传人不能为空' });
      return;
    }

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const buffer = Buffer.from(fileData, 'base64');
    
    const validation = attachmentService.validateAttachment(originalName, buffer.length, mimeType);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const currentCount = await attachmentService.getAttachmentCountByTicketId(id);
    if (currentCount >= MAX_ATTACHMENTS_PER_TICKET) {
      res.status(400).json({ 
        error: `单条工单最多只能上传 ${MAX_ATTACHMENTS_PER_TICKET} 个附件` 
      });
      return;
    }

    const attachment = await attachmentService.uploadAttachment(
      id,
      originalName,
      mimeType,
      buffer,
      uploadedBy
    );

    await actionLogService.logAttachmentAdd(id, uploadedBy, originalName);

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

export const getAttachments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const attachments = await attachmentService.getAttachmentsByTicketId(id);

    res.json(attachments);
  } catch (error) {
    console.error('Error getting attachments:', error);
    res.status(500).json({ error: 'Failed to get attachments' });
  }
};

export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;

    const attachment = await attachmentService.getAttachmentById(attachmentId);
    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const filePath = attachmentService.getAttachmentFilePath(attachment.fileName);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Attachment file not found' });
      return;
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
};

export const getAttachmentConfig = async (req: Request, res: Response): Promise<void> => {
  res.json({
    maxAttachmentsPerTicket: MAX_ATTACHMENTS_PER_TICKET,
    maxAttachmentSize: MAX_ATTACHMENT_SIZE,
    maxAttachmentSizeMB: MAX_ATTACHMENT_SIZE / 1024 / 1024,
    allowedExtensions: ALLOWED_ATTACHMENT_EXTENSIONS
  });
};
