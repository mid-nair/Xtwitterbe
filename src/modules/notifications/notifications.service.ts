import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { AppError } from '@/shared/errors/AppError';
import { FEED_PAGE_SIZE } from '@/config/constants';

interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  tweetId?: string | null;
}

/** Create a notification, never notifying a user about their own action. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (input.recipientId === input.actorId) return;

  // Like/repost notifications are idempotent: repeated taps of the same
  // action produce a single row.
  if (input.type === 'LIKE' || input.type === 'REPOST') {
    const existing = await prisma.notification.findFirst({
      where: {
        recipient_id: input.recipientId,
        actor_id: input.actorId,
        type: input.type,
        tweet_id: input.tweetId ?? null,
      },
      select: { id: true },
    });
    if (existing) return;
  }

  await prisma.notification.create({
    data: {
      recipient_id: input.recipientId,
      actor_id: input.actorId,
      type: input.type,
      tweet_id: input.tweetId ?? null,
    },
  });
}

/** Remove the matching notification when the underlying action is undone. */
export async function removeNotification(input: CreateNotificationInput): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      recipient_id: input.recipientId,
      actor_id: input.actorId,
      type: input.type,
      // MongoDB stores unset optional fields as absent, so match both.
      ...(input.tweetId
        ? { tweet_id: input.tweetId }
        : { OR: [{ tweet_id: null }, { tweet_id: { isSet: false } }] }),
    },
  });
}

export async function listNotifications(viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;

  const notifications = await prisma.notification.findMany({
    where: {
      recipient_id: viewerId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: {
      actor: {
        select: { id: true, username: true, display_name: true, avatar_url: true, is_verified: true },
      },
      tweet: { select: { id: true, content: true } },
    },
  });

  const data = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    read: notification.read_at !== null,
    created_at: notification.created_at.toISOString(),
    actor: notification.actor,
    tweet: notification.tweet,
  }));

  const hasMore = notifications.length === limit;
  return {
    data,
    next_cursor: hasMore ? notifications[notifications.length - 1].id : null,
  };
}

/** Matches both explicit `null` and missing `read_at` values in MongoDB. */
const unreadNotificationWhere: Prisma.NotificationWhereInput = {
  OR: [{ read_at: null }, { read_at: { isSet: false } }],
};

export async function getUnreadNotificationCount(viewerId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipient_id: viewerId, ...unreadNotificationWhere },
  });
}

export async function markAllNotificationsRead(viewerId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipient_id: viewerId, ...unreadNotificationWhere },
    data: { read_at: new Date() },
  });
}

export async function markNotificationRead(notificationId: string, viewerId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipient_id !== viewerId) {
    throw AppError.notFound('Notification not found.');
  }
  if (notification.read_at) return;
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read_at: new Date() },
  });
}
