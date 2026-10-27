import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import {
  listNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
  unreadCountHandler,
} from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', listNotificationsHandler);
router.get('/unread-count', unreadCountHandler);
router.post('/read-all', markAllReadHandler);
router.post('/:notificationId/read', markReadHandler);

export default router;
