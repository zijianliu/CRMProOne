import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database';
import { Notification, NotificationType, Ticket } from '../types';

function rowToNotification(row: any[]): Notification {
  return {
    id: row[0],
    userId: row[1],
    ticketId: row[2],
    type: row[3] as NotificationType,
    title: row[4],
    content: row[5],
    isRead: row[6] === 1,
    createdAt: new Date(row[7])
  };
}

export async function createNotification(
  userId: string,
  ticketId: string,
  type: NotificationType,
  title: string,
  content: string
): Promise<Notification> {
  const db = getDatabase();
  const now = new Date();
  const id = uuidv4();

  db.run(
    `INSERT INTO notifications (id, userId, ticketId, type, title, content, isRead, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, ticketId, type, title, content, 0, now.toISOString()]
  );

  saveDatabase();

  const result = db.exec(
    'SELECT id, userId, ticketId, type, title, content, isRead, createdAt FROM notifications WHERE id = ?',
    [id]
  );
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create notification');
  }

  return rowToNotification(result[0].values[0]);
}

export async function createNotificationForMultipleUsers(
  userIds: string[],
  ticketId: string,
  type: NotificationType,
  title: string,
  content: string
): Promise<Notification[]> {
  const notifications: Notification[] = [];
  
  for (const userId of userIds) {
    try {
      const notification = await createNotification(userId, ticketId, type, title, content);
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error);
    }
  }
  
  return notifications;
}

export async function getNotificationsByUserId(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const db = getDatabase();
  const result = db.exec(
    `SELECT id, userId, ticketId, type, title, content, isRead, createdAt 
     FROM notifications 
     WHERE userId = ? 
     ORDER BY createdAt DESC 
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  const notifications: Notification[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      notifications.push(rowToNotification(row));
    }
  }

  return notifications;
}

export async function getUnreadNotificationsByUserId(userId: string): Promise<Notification[]> {
  const db = getDatabase();
  const result = db.exec(
    `SELECT id, userId, ticketId, type, title, content, isRead, createdAt 
     FROM notifications 
     WHERE userId = ? AND isRead = 0 
     ORDER BY createdAt DESC`,
    [userId]
  );

  const notifications: Notification[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      notifications.push(rowToNotification(row));
    }
  }

  return notifications;
}

export async function getUnreadCountByUserId(userId: string): Promise<number> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT COUNT(*) FROM notifications WHERE userId = ? AND isRead = 0',
    [userId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return 0;
  }

  return result[0].values[0][0];
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const db = getDatabase();
  
  const result = db.run(
    'UPDATE notifications SET isRead = 1 WHERE id = ?',
    [notificationId]
  );

  saveDatabase();
  
  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const db = getDatabase();
  
  db.run(
    'UPDATE notifications SET isRead = 1 WHERE userId = ?',
    [userId]
  );

  saveDatabase();
  
  return true;
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, userId, ticketId, type, title, content, isRead, createdAt FROM notifications WHERE id = ?',
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToNotification(result[0].values[0]);
}

export function generateNotificationContent(
  type: NotificationType,
  ticket: Ticket,
  operator?: string,
  additionalInfo?: string
): { title: string; content: string } {
  let title: string;
  let content: string;

  switch (type) {
    case NotificationType.TICKET_ASSIGNED:
      title = '工单已分配';
      content = `工单「${ticket.title}」已分配给您处理，请及时查看。`;
      break;

    case NotificationType.STATUS_CHANGED:
      title = '工单状态变更';
      content = `工单「${ticket.title}」的状态已变更。${additionalInfo || ''}`;
      break;

    case NotificationType.SLA_WARNING:
      title = 'SLA预警通知';
      content = `工单「${ticket.title}」即将超时，请尽快处理。`;
      break;

    case NotificationType.SLA_OVERDUE:
      title = 'SLA超时通知';
      content = `工单「${ticket.title}」已超时，请立即处理。`;
      break;

    case NotificationType.COMMENT_ADDED:
      title = '新增备注通知';
      content = `工单「${ticket.title}」有新的处理备注，${operator ? `由「${operator}」添加` : ''}。`;
      break;

    default:
      title = '系统通知';
      content = `工单「${ticket.title}」有新的动态。`;
  }

  return { title, content };
}
