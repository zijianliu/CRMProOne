import { Response } from 'express';
import * as notificationService from '../services/notificationService';
import { AuthenticatedRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const { limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const parsedOffset = Math.max(0, parseInt(offset as string, 10) || 0);

    const notifications = await notificationService.getNotificationsByUserId(
      user.id,
      parsedLimit,
      parsedOffset
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

export const getUnreadNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const notifications = await notificationService.getUnreadNotificationsByUserId(user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    res.status(500).json({ error: 'Failed to get unread notifications' });
  }
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const count = await notificationService.getUnreadCountByUserId(user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    const { notificationId } = req.params;

    const notification = await notificationService.getNotificationById(notificationId);
    if (!notification) {
      res.status(404).json({ error: '通知不存在' });
      return;
    }

    if (notification.userId !== user.id) {
      res.status(403).json({ error: '无权操作此通知' });
      return;
    }

    await notificationService.markNotificationAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }

    await notificationService.markAllNotificationsAsRead(user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};
