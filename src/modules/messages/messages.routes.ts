import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { openConversationSchema, sendMessageSchema } from './messages.dto';
import {
  listConversationsHandler,
  listMessagesHandler,
  markReadHandler,
  openConversationHandler,
  sendMessageHandler,
  unreadCountHandler,
} from './messages.controller';

const router = Router();

router.use(authenticate);

router.get('/', listConversationsHandler);
router.post('/', validate(openConversationSchema), openConversationHandler);
router.get('/unread-count', unreadCountHandler);
router.get('/:conversationId/messages', listMessagesHandler);
router.post('/:conversationId/messages', validate(sendMessageSchema), sendMessageHandler);
router.post('/:conversationId/read', markReadHandler);

export default router;
