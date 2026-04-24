import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database';
import { 
  Ticket, 
  TicketComment, 
  TicketStatus, 
  TicketPriority, 
  UserRole,
  PaginatedResponse, 
  Statistics,
  isValidStatusTransition
} from '../types';
import * as actionLogService from './actionLogService';
import * as slaService from './slaService';

function rowToTicket(row: any[]): Ticket {
  return {
    id: row[0],
    title: row[1],
    description: row[2],
    submitter: row[3],
    assignee: row[4],
    priority: row[5] as TicketPriority,
    status: row[6] as TicketStatus,
    responseDeadline: new Date(row[7]),
    resolutionDeadline: new Date(row[8]),
    responseTime: row[9] ? new Date(row[9]) : null,
    resolutionTime: row[10] ? new Date(row[10]) : null,
    createdAt: new Date(row[11]),
    updatedAt: new Date(row[12])
  };
}

function rowToComment(row: any[]): TicketComment {
  return {
    id: row[0],
    ticketId: row[1],
    content: row[2],
    author: row[3],
    createdAt: new Date(row[4])
  };
}

export async function createTicket(
  title: string,
  description: string,
  submitter: string,
  assignee: string | null,
  priority: TicketPriority
): Promise<Ticket> {
  const db = getDatabase();
  const now = new Date();
  const id = uuidv4();

  const { responseDeadline, resolutionDeadline } = slaService.calculateDeadlines(priority, now);

  db.run(
    `INSERT INTO tickets (
      id, title, description, submitter, assignee, priority, status, 
      responseDeadline, resolutionDeadline, responseTime, resolutionTime, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, title, description, submitter, assignee, priority, TicketStatus.PENDING,
      responseDeadline.toISOString(), resolutionDeadline.toISOString(), null, null,
      now.toISOString(), now.toISOString()
    ]
  );

  saveDatabase();

  await actionLogService.logTicketCreate(id, submitter);

  if (assignee) {
    await actionLogService.logAssigneeChange(id, submitter, null, assignee);
  }

  const result = db.exec(
    `SELECT id, title, description, submitter, assignee, priority, status, 
            responseDeadline, resolutionDeadline, responseTime, resolutionTime, createdAt, updatedAt 
     FROM tickets WHERE id = ?`,
    [id]
  );
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create ticket');
  }

  return rowToTicket(result[0].values[0]);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = getDatabase();
  const result = db.exec(
    `SELECT id, title, description, submitter, assignee, priority, status, 
            responseDeadline, resolutionDeadline, responseTime, resolutionTime, createdAt, updatedAt 
     FROM tickets WHERE id = ?`,
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToTicket(result[0].values[0]);
}

export async function getTickets(
  page: number = 1,
  pageSize: number = 10,
  status?: TicketStatus,
  priority?: TicketPriority,
  search?: string,
  assignee?: string,
  myAssignee?: string,
  startDate?: string,
  endDate?: string
): Promise<PaginatedResponse<Ticket>> {
  const db = getDatabase();
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  if (priority) {
    whereClause += ' AND priority = ?';
    params.push(priority);
  }

  if (assignee) {
    whereClause += ' AND assignee = ?';
    params.push(assignee);
  }

  if (myAssignee) {
    whereClause += ' AND (assignee = ? OR assignee IS NULL)';
    params.push(myAssignee);
  }

  if (startDate) {
    whereClause += ' AND date(createdAt) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND date(createdAt) <= date(?)';
    params.push(endDate);
  }

  if (search) {
    whereClause += ' AND (title LIKE ? OR description LIKE ? OR submitter LIKE ? OR assignee LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const countResult = db.exec(
    `SELECT COUNT(*) FROM tickets ${whereClause}`,
    params
  );
  const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  const offset = (page - 1) * pageSize;
  const dataParams = [...params, pageSize, offset];
  
  const result = db.exec(
    `SELECT id, title, description, submitter, assignee, priority, status, 
            responseDeadline, resolutionDeadline, responseTime, resolutionTime, createdAt, updatedAt 
     FROM tickets ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    dataParams
  );

  const tickets: Ticket[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      tickets.push(rowToTicket(row));
    }
  }

  return {
    data: tickets,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  operator: string
): Promise<Ticket | null> {
  const db = getDatabase();
  const now = new Date();

  const existingTicket = await getTicketById(id);
  if (!existingTicket) {
    return null;
  }

  if (existingTicket.status === status) {
    return existingTicket;
  }

  if (!isValidStatusTransition(existingTicket.status, status)) {
    throw new Error(`无法将状态从「${existingTicket.status}」修改为「${status}」`);
  }

  const responseTime = existingTicket.responseTime;
  const resolutionTime = existingTicket.resolutionTime;

  if (existingTicket.status === TicketStatus.PENDING && status === TicketStatus.IN_PROGRESS) {
    const responseTimeToUpdate = responseTime || now;
    db.run(
      'UPDATE tickets SET status = ?, responseTime = ?, updatedAt = ? WHERE id = ?',
      [status, responseTimeToUpdate.toISOString(), now.toISOString(), id]
    );
  } else if (status === TicketStatus.RESOLVED) {
    const resolutionTimeToUpdate = resolutionTime || now;
    db.run(
      'UPDATE tickets SET status = ?, resolutionTime = ?, updatedAt = ? WHERE id = ?',
      [status, resolutionTimeToUpdate.toISOString(), now.toISOString(), id]
    );
  } else {
    db.run(
      'UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?',
      [status, now.toISOString(), id]
    );
  }

  saveDatabase();

  await actionLogService.logStatusChange(id, operator, existingTicket.status, status);

  return getTicketById(id);
}

export async function updateTicketAssignee(
  id: string,
  assignee: string | null,
  operator: string
): Promise<Ticket | null> {
  const db = getDatabase();
  const now = new Date();

  const existingTicket = await getTicketById(id);
  if (!existingTicket) {
    return null;
  }

  if (existingTicket.assignee === assignee) {
    return existingTicket;
  }

  db.run(
    'UPDATE tickets SET assignee = ?, updatedAt = ? WHERE id = ?',
    [assignee, now.toISOString(), id]
  );

  saveDatabase();

  await actionLogService.logAssigneeChange(id, operator, existingTicket.assignee, assignee);

  return getTicketById(id);
}

export async function addComment(
  ticketId: string,
  content: string,
  author: string
): Promise<TicketComment> {
  const db = getDatabase();
  const now = new Date();
  const id = uuidv4();

  db.run(
    `INSERT INTO comments (id, ticketId, content, author, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [id, ticketId, content, author, now.toISOString()]
  );

  saveDatabase();

  await actionLogService.logCommentAdd(ticketId, author, content);

  const result = db.exec('SELECT * FROM comments WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to add comment');
  }

  return rowToComment(result[0].values[0]);
}

export async function getCommentsByTicketId(ticketId: string): Promise<TicketComment[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT * FROM comments WHERE ticketId = ? ORDER BY createdAt ASC',
    [ticketId]
  );

  const comments: TicketComment[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      comments.push(rowToComment(row));
    }
  }

  return comments;
}

export async function getStatistics(myAssignee?: string): Promise<Statistics> {
  const db = getDatabase();

  const totalResult = db.exec('SELECT COUNT(*) FROM tickets');
  const total = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;

  const pendingResult = db.exec('SELECT COUNT(*) FROM tickets WHERE status = ?', [TicketStatus.PENDING]);
  const pending = pendingResult.length > 0 ? pendingResult[0].values[0][0] : 0;

  const inProgressResult = db.exec('SELECT COUNT(*) FROM tickets WHERE status = ?', [TicketStatus.IN_PROGRESS]);
  const inProgress = inProgressResult.length > 0 ? inProgressResult[0].values[0][0] : 0;

  const resolvedResult = db.exec('SELECT COUNT(*) FROM tickets WHERE status = ?', [TicketStatus.RESOLVED]);
  const resolved = resolvedResult.length > 0 ? resolvedResult[0].values[0][0] : 0;

  let myTickets = 0;
  if (myAssignee) {
    const myTicketsResult = db.exec(
      'SELECT COUNT(*) FROM tickets WHERE assignee = ? OR assignee IS NULL',
      [myAssignee]
    );
    myTickets = myTicketsResult.length > 0 ? myTicketsResult[0].values[0][0] : 0;
  }

  return {
    pending,
    inProgress,
    resolved,
    total,
    myTickets
  };
}

export async function getAllAssignees(): Promise<string[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT DISTINCT assignee FROM tickets WHERE assignee IS NOT NULL AND assignee != "" ORDER BY assignee'
  );

  const assignees: string[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      if (row[0]) {
        assignees.push(row[0]);
      }
    }
  }

  return assignees;
}
