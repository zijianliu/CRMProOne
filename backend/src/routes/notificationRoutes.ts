import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, notificationController.getNotifications);

router.get('/unread', authMiddleware, notificationController.getUnreadNotifications);

router.get('/unread/count', authMiddleware, notificationController.getUnreadCount);

router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);

router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

export default router;
