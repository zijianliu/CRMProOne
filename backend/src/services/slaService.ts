import { 
  Ticket, 
  TicketPriority, 
  SLAStatus, 
  SLAInfo, 
  SLA_RULES, 
  SLA_WARNING_THRESHOLD 
} from '../types';

export function calculateDeadlines(
  priority: TicketPriority,
  createdAt: Date
): { responseDeadline: Date; resolutionDeadline: Date } {
  const rules = SLA_RULES[priority];
  const responseDeadline = new Date(createdAt.getTime() + rules.responseMinutes * 60 * 1000);
  const resolutionDeadline = new Date(createdAt.getTime() + rules.resolutionMinutes * 60 * 1000);
  
  return { responseDeadline, resolutionDeadline };
}

export function calculateSLAStatus(
  deadline: Date,
  completedTime: Date | null,
  now: Date = new Date()
): SLAStatus {
  if (completedTime) {
    return completedTime <= deadline ? SLAStatus.NORMAL : SLAStatus.OVERDUE;
  }

  if (now > deadline) {
    return SLAStatus.OVERDUE;
  }

  const timeRemaining = deadline.getTime() - now.getTime();
  
  const warningThreshold = 30 * 60 * 1000;
  
  if (timeRemaining <= warningThreshold) {
    return SLAStatus.WARNING;
  }

  return SLAStatus.NORMAL;
}

export function getSLAInfo(ticket: Ticket): SLAInfo {
  const now = new Date();
  
  const responseStatus = calculateSLAStatus(
    new Date(ticket.responseDeadline),
    ticket.responseTime ? new Date(ticket.responseTime) : null,
    now
  );

  const resolutionStatus = calculateSLAStatus(
    new Date(ticket.resolutionDeadline),
    ticket.resolutionTime ? new Date(ticket.resolutionTime) : null,
    now
  );

  let overallStatus: SLAStatus;
  if (responseStatus === SLAStatus.OVERDUE || resolutionStatus === SLAStatus.OVERDUE) {
    overallStatus = SLAStatus.OVERDUE;
  } else if (responseStatus === SLAStatus.WARNING || resolutionStatus === SLAStatus.WARNING) {
    overallStatus = SLAStatus.WARNING;
  } else {
    overallStatus = SLAStatus.NORMAL;
  }

  return {
    responseDeadline: new Date(ticket.responseDeadline),
    resolutionDeadline: new Date(ticket.resolutionDeadline),
    responseTime: ticket.responseTime ? new Date(ticket.responseTime) : null,
    resolutionTime: ticket.resolutionTime ? new Date(ticket.resolutionTime) : null,
    responseStatus,
    resolutionStatus,
    overallStatus
  };
}

export function formatSLAStatusForDisplay(slaInfo: SLAInfo): {
  overallStatus: SLAStatus;
  responseTimeRemaining: string | null;
  resolutionTimeRemaining: string | null;
  responseOverdue: boolean;
  resolutionOverdue: boolean;
} {
  const now = new Date();
  
  const getTimeRemaining = (deadline: Date, completedTime: Date | null): string | null => {
    if (completedTime) {
      return '已完成';
    }
    
    const remaining = deadline.getTime() - now.getTime();
    if (remaining <= 0) {
      return '已超时';
    }
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  return {
    overallStatus: slaInfo.overallStatus,
    responseTimeRemaining: getTimeRemaining(slaInfo.responseDeadline, slaInfo.responseTime),
    resolutionTimeRemaining: getTimeRemaining(slaInfo.resolutionDeadline, slaInfo.resolutionTime),
    responseOverdue: slaInfo.responseStatus === SLAStatus.OVERDUE,
    resolutionOverdue: slaInfo.resolutionStatus === SLAStatus.OVERDUE
  };
}
