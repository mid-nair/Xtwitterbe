import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import * as messagesService from './messages.service';
import type { OpenConversationDto, SendMessageDto } from './messages.dto';

// GET /api/v1/conversations
export async function listConversationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const conversations = await messagesService.listConversations(sub);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/conversations
export async function openConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { user_id } = req.body as OpenConversationDto;
    const conversation = await messagesService.openConversation(sub, user_id);
    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/conversations/unread-count
export async function unreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const count = await messagesService.getUnreadMessageCount(sub);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/conversations/:conversationId/messages?cursor=
export async function listMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor } = req.query as { cursor?: string };
    const page = await messagesService.listMessages(
      (req.params as any).conversationId,
      sub,
      cursor,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/conversations/:conversationId/messages
export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { content } = req.body as SendMessageDto;
    const message = await messagesService.sendMessage(
      (req.params as any).conversationId,
      sub,
      content,
    );
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/conversations/:conversationId/read
export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await messagesService.markConversationRead((req.params as any).conversationId, sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
