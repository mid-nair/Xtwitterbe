import type { Conversation, Message, User } from '@prisma/client';
import { prisma } from '@/config/database';
import { AppError } from '@/shared/errors/AppError';

const PAGE_SIZE = 30;

type OtherUser = Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>;

function formatUser(user: OtherUser) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified,
  };
}

function formatMessage(message: Message) {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    content: message.content,
    read: message.read_at !== null,
    created_at: message.created_at.toISOString(),
  };
}

/** Always store participant ids sorted so 1:1 lookups are deterministic. */
function pairIds(a: string, b: string): string[] {
  return [a, b].sort();
}

async function assertParticipant(conversationId: string, viewerId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || !conversation.participant_ids.includes(viewerId)) {
    throw AppError.notFound('Conversation not found.');
  }
  return conversation;
}

async function formatConversations(conversations: Conversation[], viewerId: string) {
  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c.id);
  const otherIds = conversations
    .map((c) => c.participant_ids.find((id) => id !== viewerId))
    .filter((id): id is string => !!id);

  const [users, latestGroups, unreadGroups] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        is_verified: true,
      },
    }),
    prisma.message.groupBy({
      by: ['conversation_id'],
      where: { conversation_id: { in: conversationIds } },
      _max: { id: true },
    }),
    prisma.message.groupBy({
      by: ['conversation_id'],
      where: {
        conversation_id: { in: conversationIds },
        sender_id: { not: viewerId },
        OR: [{ read_at: null }, { read_at: { isSet: false } }],
      },
      _count: { _all: true },
    }),
  ]);

  const latestIds = latestGroups
    .map((group) => group._max.id)
    .filter((id): id is string => !!id);
  const latestMessages = latestIds.length
    ? await prisma.message.findMany({ where: { id: { in: latestIds } } })
    : [];

  const usersById = new Map(users.map((user) => [user.id, user]));
  const latestByConversation = new Map(
    latestMessages.map((message) => [message.conversation_id, message]),
  );
  const unreadByConversation = new Map(
    unreadGroups.map((group) => [group.conversation_id, group._count._all]),
  );

  return conversations
    .map((conversation) => {
      const otherId = conversation.participant_ids.find((id) => id !== viewerId);
      const other = otherId ? usersById.get(otherId) : undefined;
      if (!other) return null;

      const lastMessage = latestByConversation.get(conversation.id);
      return {
        id: conversation.id,
        other_user: formatUser(other),
        last_message: lastMessage ? formatMessage(lastMessage) : null,
        unread_count: unreadByConversation.get(conversation.id) ?? 0,
        updated_at: conversation.last_message_at.toISOString(),
      };
    })
    .filter((conversation): conversation is NonNullable<typeof conversation> => conversation !== null);
}

export async function listConversations(viewerId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participant_ids: { has: viewerId } },
    orderBy: { last_message_at: 'desc' },
  });
  return formatConversations(conversations, viewerId);
}

export async function openConversation(viewerId: string, otherUserId: string) {
  if (viewerId === otherUserId) {
    throw AppError.badRequest('You cannot message yourself.');
  }

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      is_verified: true,
    },
  });
  if (!other) throw AppError.notFound('User not found.');

  const ids = pairIds(viewerId, otherUserId);
  let conversation = await prisma.conversation.findFirst({
    where: { participant_ids: { equals: ids } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { participant_ids: ids } });
  }

  const [formatted] = await formatConversations([conversation], viewerId);
  return formatted;
}

export async function listMessages(conversationId: string, viewerId: string, cursor?: string) {
  await assertParticipant(conversationId, viewerId);

  // Newest first; the client reverses the flattened pages for display.
  const messages = await prisma.message.findMany({
    where: {
      conversation_id: conversationId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE,
  });

  const hasMore = messages.length === PAGE_SIZE;
  return {
    data: messages.map(formatMessage),
    next_cursor: hasMore ? messages[messages.length - 1].id : null,
  };
}

export async function sendMessage(
  conversationId: string,
  viewerId: string,
  content: string,
) {
  await assertParticipant(conversationId, viewerId);

  const message = await prisma.message.create({
    data: { conversation_id: conversationId, sender_id: viewerId, content },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { last_message_at: message.created_at },
  });

  return formatMessage(message);
}

export async function markConversationRead(conversationId: string, viewerId: string) {
  await assertParticipant(conversationId, viewerId);
  await prisma.message.updateMany({
    where: {
      conversation_id: conversationId,
      sender_id: { not: viewerId },
      // MongoDB stores unset optional fields as absent, so match both.
      OR: [{ read_at: null }, { read_at: { isSet: false } }],
    },
    data: { read_at: new Date() },
  });
}

export async function getUnreadMessageCount(viewerId: string): Promise<number> {
  return prisma.message.count({
    where: {
      conversation: { participant_ids: { has: viewerId } },
      sender_id: { not: viewerId },
      OR: [{ read_at: null }, { read_at: { isSet: false } }],
    },
  });
}
