export enum TicketStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum UserRole {
  SUBMITTER = 'submitter',
  HANDLER = 'handler',
  ADMIN = 'admin'
}

export enum SLAStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  OVERDUE = 'overdue'
}

export enum NotificationType {
  TICKET_ASSIGNED = 'ticket_assigned',
  STATUS_CHANGED = 'status_changed',
  SLA_WARNING = 'sla_warning',
  SLA_OVERDUE = 'sla_overdue',
  COMMENT_ADDED = 'comment_added'
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export interface SLARules {
  responseMinutes: number;
  resolutionMinutes: number;
}

export interface SLAInfo {
  responseDeadline: Date;
  resolutionDeadline: Date;
  responseTime: Date | null;
  resolutionTime: Date | null;
  responseStatus: SLAStatus;
  resolutionStatus: SLAStatus;
  overallStatus: SLAStatus;
}

export interface Notification {
  id: string;
  userId: string;
  ticketId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export enum ActionType {
  STATUS_CHANGE = 'status_change',
  ASSIGNEE_CHANGE = 'assignee_change',
  COMMENT_ADD = 'comment_add',
  ATTACHMENT_ADD = 'attachment_add',
  TICKET_CREATE = 'ticket_create'
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  submitter: string;
  assignee: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  responseDeadline: Date;
  resolutionDeadline: Date;
  responseTime: Date | null;
  resolutionTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  content: string;
  author: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface ActionLog {
  id: string;
  ticketId: string;
  actionType: ActionType;
  operator: string;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  createdAt: Date;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  submitter: string;
  assignee?: string;
  priority: TicketPriority;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  operator: string;
}

export interface UpdateTicketAssigneeRequest {
  assignee: string | null;
  operator: string;
}

export interface CreateCommentRequest {
  content: string;
  author: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Statistics {
  pending: number;
  inProgress: number;
  resolved: number;
  total: number;
  myTickets: number;
}

export interface StatusTransition {
  from: TicketStatus | null;
  to: TicketStatus;
  allowed: boolean;
}

export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.PENDING]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: []
};

export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
  'application/pdf'
];

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.txt', '.pdf'];

export const MAX_ATTACHMENTS_PER_TICKET = 3;

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function isValidStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function getStatusChangeDescription(oldStatus: TicketStatus, newStatus: TicketStatus): string {
  const statusLabels: Record<TicketStatus, string> = {
    [TicketStatus.PENDING]: '待处理',
    [TicketStatus.IN_PROGRESS]: '处理中',
    [TicketStatus.RESOLVED]: '已解决'
  };
  return `将状态从「${statusLabels[oldStatus]}」修改为「${statusLabels[newStatus]}」`;
}

export function getAssigneeChangeDescription(oldAssignee: string | null, newAssignee: string | null): string {
  if (!oldAssignee && newAssignee) {
    return `分配工单给「${newAssignee}」`;
  } else if (oldAssignee && !newAssignee) {
    return `取消「${oldAssignee}」的工单分配`;
  } else if (oldAssignee && newAssignee) {
    return `将工单从「${oldAssignee}」重新分配给「${newAssignee}」`;
  }
  return '修改处理人';
}

export const SLA_RULES: Record<TicketPriority, SLARules> = {
  [TicketPriority.URGENT]: {
    responseMinutes: 30,
    resolutionMinutes: 240
  },
  [TicketPriority.HIGH]: {
    responseMinutes: 120,
    resolutionMinutes: 1440
  },
  [TicketPriority.MEDIUM]: {
    responseMinutes: 240,
    resolutionMinutes: 2880
  },
  [TicketPriority.LOW]: {
    responseMinutes: 1440,
    resolutionMinutes: 4320
  }
};

export const SLA_WARNING_THRESHOLD = 0.7;

export const RoleLabelMap: Record<UserRole, string> = {
  [UserRole.SUBMITTER]: '提交人',
  [UserRole.HANDLER]: '处理人',
  [UserRole.ADMIN]: '管理员'
};

export const SLAStatusLabelMap: Record<SLAStatus, string> = {
  [SLAStatus.NORMAL]: '正常',
  [SLAStatus.WARNING]: '即将超时',
  [SLAStatus.OVERDUE]: '已超时'
};

export const NotificationTypeLabelMap: Record<NotificationType, string> = {
  [NotificationType.TICKET_ASSIGNED]: '工单分配',
  [NotificationType.STATUS_CHANGED]: '状态变更',
  [NotificationType.SLA_WARNING]: 'SLA预警',
  [NotificationType.SLA_OVERDUE]: 'SLA超时',
  [NotificationType.COMMENT_ADDED]: '新增备注'
};
