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
  createdAt: string;
}

export interface SLAInfo {
  responseDeadline: string;
  resolutionDeadline: string;
  responseTime: string | null;
  resolutionTime: string | null;
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
  createdAt: string;
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
  responseDeadline: string;
  resolutionDeadline: string;
  responseTime: string | null;
  resolutionTime: string | null;
  createdAt: string;
  updatedAt: string;
  slaInfo?: SLAInfo;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ActionLog {
  id: string;
  ticketId: string;
  actionType: ActionType;
  operator: string;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  createdAt: string;
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

export interface AttachmentConfig {
  maxAttachmentsPerTicket: number;
  maxAttachmentSize: number;
  maxAttachmentSizeMB: number;
  allowedExtensions: string[];
}

export const StatusLabelMap: Record<TicketStatus, string> = {
  [TicketStatus.PENDING]: '待处理',
  [TicketStatus.IN_PROGRESS]: '处理中',
  [TicketStatus.RESOLVED]: '已解决'
};

export const PriorityLabelMap: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: '低',
  [TicketPriority.MEDIUM]: '中',
  [TicketPriority.HIGH]: '高',
  [TicketPriority.URGENT]: '紧急'
};

export const ActionTypeLabelMap: Record<ActionType, string> = {
  [ActionType.STATUS_CHANGE]: '状态变更',
  [ActionType.ASSIGNEE_CHANGE]: '处理人变更',
  [ActionType.COMMENT_ADD]: '添加备注',
  [ActionType.ATTACHMENT_ADD]: '上传附件',
  [ActionType.TICKET_CREATE]: '创建工单'
};

export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.PENDING]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: []
};

export function isValidStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function getNextStatusOptions(currentStatus: TicketStatus): { value: TicketStatus; label: string }[] {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.map(status => ({
    value: status,
    label: StatusLabelMap[status]
  }));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

export const SLA_RULES: Record<TicketPriority, { responseMinutes: number; resolutionMinutes: number }> = {
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

export function hasRole(user: User | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, [UserRole.ADMIN]);
}

export function isHandler(user: User | null | undefined): boolean {
  return hasRole(user, [UserRole.HANDLER, UserRole.ADMIN]);
}

export function isSubmitter(user: User | null | undefined): boolean {
  return hasRole(user, [UserRole.SUBMITTER, UserRole.HANDLER, UserRole.ADMIN]);
}
