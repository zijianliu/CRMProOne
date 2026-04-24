import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { UserRole, RoleLabelMap } from '../types';
import { AuthenticatedRequest, isAdmin } from '../middleware/auth';

export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ error: '用户未登录' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

export const getHandlers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const handlers = await userService.getHandlers();
    res.json(handlers);
  } catch (error) {
    console.error('Error getting handlers:', error);
    res.status(500).json({ error: 'Failed to get handlers' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req.currentUser)) {
      res.status(403).json({ error: '只有管理员可以创建用户' });
      return;
    }

    const { username, displayName, role } = req.body;

    if (!username || !displayName || !role) {
      res.status(400).json({ error: '用户名、显示名和角色不能为空' });
      return;
    }

    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      res.status(400).json({ 
        error: `角色必须是以下之一: ${validRoles.join(', ')}` 
      });
      return;
    }

    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const user = await userService.createUser(
      username,
      displayName,
      role as UserRole
    );

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};
