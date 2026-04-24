import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database';
import { ActionLog, ActionType, TicketStatus, getStatusChangeDescription, getAssigneeChangeDescription } from '../types';

function rowToActionLog(row: any[]): ActionLog {
  return {
    id: row[0],
    ticketId: row[1],
    actionType: row[2] as ActionType,
    operator: row[3],
    oldValue: row[4],
    newValue: row[5],
    description: row[6],
    createdAt: new Date(row[7])
  };
}

export async function createActionLog(
  ticketId: string,
  actionType: ActionType,
  operator: string,
  oldValue: string | null,
  newValue: string | null,
  description: string
): Promise<ActionLog> {
  const db = getDatabase();
  const now = new Date();
  const id = uuidv4();

  db.run(
    `INSERT INTO action_logs (id, ticketId, actionType, operator, oldValue, newValue, description, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ticketId, actionType, operator, oldValue, newValue, description, now.toISOString()]
  );

  saveDatabase();

  const result = db.exec('SELECT * FROM action_logs WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create action log');
  }

  return rowToActionLog(result[0].values[0]);
}

export async function logStatusChange(
  ticketId: string,
  operator: string,
  oldStatus: TicketStatus,
  newStatus: TicketStatus
): Promise<ActionLog> {
  const description = getStatusChangeDescription(oldStatus, newStatus);
  return createActionLog(
    ticketId,
    ActionType.STATUS_CHANGE,
    operator,
    oldStatus,
    newStatus,
    description
  );
}

export async function logAssigneeChange(
  ticketId: string,
  operator: string,
  oldAssignee: string | null,
  newAssignee: string | null
): Promise<ActionLog> {
  const description = getAssigneeChangeDescription(oldAssignee, newAssignee);
  return createActionLog(
    ticketId,
    ActionType.ASSIGNEE_CHANGE,
    operator,
    oldAssignee,
    newAssignee,
    description
  );
}

export async function logCommentAdd(
  ticketId: string,
  operator: string,
  content: string
): Promise<ActionLog> {
  const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
  const description = `添加了备注：${shortContent}`;
  return createActionLog(
    ticketId,
    ActionType.COMMENT_ADD,
    operator,
    null,
    shortContent,
    description
  );
}

export async function logAttachmentAdd(
  ticketId: string,
  operator: string,
  fileName: string
): Promise<ActionLog> {
  const description = `上传了附件：${fileName}`;
  return createActionLog(
    ticketId,
    ActionType.ATTACHMENT_ADD,
    operator,
    null,
    fileName,
    description
  );
}

export async function logTicketCreate(
  ticketId: string,
  operator: string
): Promise<ActionLog> {
  const description = '创建了工单';
  return createActionLog(
    ticketId,
    ActionType.TICKET_CREATE,
    operator,
    null,
    null,
    description
  );
}

export async function getActionLogsByTicketId(ticketId: string): Promise<ActionLog[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT * FROM action_logs WHERE ticketId = ? ORDER BY createdAt DESC',
    [ticketId]
  );

  const logs: ActionLog[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      logs.push(rowToActionLog(row));
    }
  }

  return logs;
}
