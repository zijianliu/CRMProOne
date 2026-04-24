import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/userController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

const validRoles = Object.values(UserRole);

router.get('/', userController.getAllUsers);

router.get('/me', authMiddleware, userController.getCurrentUser);

router.get('/handlers', optionalAuthMiddleware, userController.getHandlers);

router.post(
  '/',
  authMiddleware,
  [
    body('username').isString().notEmpty().withMessage('Username is required'),
    body('displayName').isString().notEmpty().withMessage('Display name is required'),
    body('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`)
  ],
  userController.createUser
);

export default router;
