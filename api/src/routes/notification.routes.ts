import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

export const notificationRouter = Router();

// Addressed to a shop or to the platform — never public
notificationRouter.use(authenticate, authorize('VENDOR', 'SUPER_ADMIN'));

notificationRouter.get('/', listNotifications);
notificationRouter.post('/read-all', markAllRead);
notificationRouter.patch('/:id/read', markRead);
