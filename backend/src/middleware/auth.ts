import { Request, Response, NextFunction } from 'express';
import { UserRole, User, Ticket } from '../types';
import * as userService from '../services/userService';
import * as ticketService from '../services/ticketService';

export interface AuthenticatedRequest extends Request {
  currentUser?: User;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers['x-user-id'] as string;
  const username = req.headers['x-username'] as string;

  if (!userId && !username) {
    return res.status(401).json({ error: '未授权访问，请先登录' });
  }

  try {
    let user: User | null = null;

    if (userId) {
      user = await userService.getUserById(userId);
    }

    if (!user && username) {
      user = await userService.getUserByUsername(username);
    }

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: '认证失败' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers['x-user-id'] as string;
  const username = req.headers['x-username'] as string;

  try {
    if (userId || username) {
      let user: User | null = null;

      if (userId) {
        user = await userService.getUserById(userId);
      }

      if (!user && username) {
        user = await userService.getUserByUsername(username);
      }

      if (user) {
        req.currentUser = user;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

export function hasRole(user: User | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isAdmin(user: User | undefined): boolean {
  return hasRole(user, [UserRole.ADMIN]);
}

export function isHandler(user: User | undefined): boolean {
  return hasRole(user, [UserRole.HANDLER, UserRole.ADMIN]);
}

export function isSubmitter(user: User | undefined): boolean {
  return hasRole(user, [UserRole.SUBMITTER, UserRole.HANDLER, UserRole.ADMIN]);
}

export function canViewTicket(user: User | undefined, ticket: Ticket): boolean {
  if (!user) return false;

  if (isAdmin(user)) {
    return true;
  }

  if (user.role === UserRole.HANDLER) {
    return ticket.assignee === user.username;
  }

  if (user.role === UserRole.SUBMITTER) {
    return ticket.submitter === user.username;
  }

  return false;
}

export function canUpdateTicketStatus(user: User | undefined, ticket: Ticket): boolean {
  if (!user) return false;

  if (isAdmin(user)) {
    return true;
  }

  if (user.role === UserRole.HANDLER) {
    return ticket.assignee === user.username;
  }

  return false;
}

export function canUpdateTicketAssignee(user: User | undefined): boolean {
  return isAdmin(user);
}

export function canCreateTicket(user: User | undefined): boolean {
  return isSubmitter(user);
}

export function canAddComment(user: User | undefined, ticket: Ticket): boolean {
  if (!user) return false;

  if (isAdmin(user)) {
    return true;
  }

  if (user.role === UserRole.HANDLER) {
    return ticket.assignee === user.username;
  }

  if (user.role === UserRole.SUBMITTER) {
    return ticket.submitter === user.username;
  }

  return false;
}

export function getTicketFilterForUser(user: User | undefined): {
  submitter?: string;
  assignee?: string;
} {
  if (!user) {
    return {};
  }

  if (isAdmin(user)) {
    return {};
  }

  if (user.role === UserRole.HANDLER) {
    return { assignee: user.username };
  }

  if (user.role === UserRole.SUBMITTER) {
    return { submitter: user.username };
  }

  return {};
}
