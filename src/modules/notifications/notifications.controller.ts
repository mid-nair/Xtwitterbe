import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import * as notificationsService from './notifications.service';

// GET /api/v1/notifications?cursor=...
export async function listNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor } = req.query as { cursor?: string };
    const page = await notificationsService.listNotifications(sub, cursor);
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/notifications/unread-count
export async function unreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const count = await notificationsService.getUnreadNotificationCount(sub);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/notifications/read-all
export async function markAllReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await notificationsService.markAllNotificationsRead(sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/notifications/:notificationId/read
export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await notificationsService.markNotificationRead((req.params as any).notificationId, sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
