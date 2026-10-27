import { prisma } from '@/config/database';
import { AppError } from '@/shared/errors/AppError';
import { paginate } from '@/shared/utils/pagination';
import { topLevelTweetWhere } from '@/shared/utils/tweetFilters';
import { FEED_PAGE_SIZE } from '@/config/constants';
import { createNotification, removeNotification } from '@/modules/notifications/notifications.service';
import {
  formatRepost,
  formatTweet,
  tweetInclude,
  type TweetWithRelations,
} from './tweet.mapper';
import type { CreateTweetDto } from './tweets.dto';

export type ProfileTweetTab = 'posts' | 'replies' | 'media' | 'reposts';

const MENTION_RE = /@([A-Za-z0-9_]{1,15})/g;

async function notifyMentions(
  content: string,
  authorId: string,
  tweetId: string,
  excludeIds: string[],
): Promise<void> {
  const usernames = [...new Set([...content.matchAll(MENTION_RE)].map((match) => match[1]))];
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, id: { notIn: [authorId, ...excludeIds] } },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) =>
      createNotification({
        recipientId: user.id,
        actorId: authorId,
        type: 'MENTION',
        tweetId,
      }),
    ),
  );
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTweet(dto: CreateTweetDto, authorId: string) {
  let replyTargetAuthorId: string | null = null;

  if (dto.reply_to_tweet_id) {
    const target = await prisma.tweet.findUnique({
      where: { id: dto.reply_to_tweet_id },
      select: { author_id: true },
    });
    if (!target) throw AppError.notFound('Reply target tweet not found.');
    replyTargetAuthorId = target.author_id;
  }

  const tweet = await prisma.tweet.create({
    data: {
      content: dto.content,
      author_id: authorId,
      reply_to_tweet_id: dto.reply_to_tweet_id,
      quote_tweet_id: dto.quote_tweet_id,
      media: {
        create: dto.media_urls.map((url) => ({ url })),
      },
    },
    include: tweetInclude(authorId),
  });

  if (replyTargetAuthorId) {
    await createNotification({
      recipientId: replyTargetAuthorId,
      actorId: authorId,
      type: 'REPLY',
      tweetId: tweet.id,
    });
  }

  await notifyMentions(
    tweet.content,
    authorId,
    tweet.id,
    replyTargetAuthorId ? [replyTargetAuthorId] : [],
  );

  return formatTweet(tweet as TweetWithRelations);
}

// ─── Detail & replies ────────────────────────────────────────────────────────

export async function getTweetDetail(tweetId: string, viewerId: string) {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    include: tweetInclude(viewerId),
  });

  if (!tweet) throw AppError.notFound('Tweet not found.');

  const parent = tweet.reply_to_tweet_id
    ? await prisma.tweet.findUnique({
        where: { id: tweet.reply_to_tweet_id },
        include: tweetInclude(viewerId),
      })
    : null;

  return {
    tweet: formatTweet(tweet as TweetWithRelations),
    parent: parent ? formatTweet(parent as TweetWithRelations) : null,
  };
}

/**
 * Direct replies to a tweet, oldest first so the thread reads top-to-bottom.
 * ObjectIds are time-ordered, so an `id: { gt: cursor }` cursor is stable.
 */
export async function getTweetReplies(tweetId: string, viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;

  const replies = await prisma.tweet.findMany({
    where: {
      reply_to_tweet_id: tweetId,
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    take: limit,
    include: tweetInclude(viewerId),
  });

  const hasMore = replies.length === limit;
  return {
    data: (replies as TweetWithRelations[]).map(formatTweet),
    next_cursor: hasMore ? replies[replies.length - 1].id : null,
  };
}

// ─── Engage ──────────────────────────────────────────────────────────────────

export async function engageTweet(
  tweetId: string,
  action: string,
  userId: string,
): Promise<void> {
  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
  if (!tweet) throw AppError.notFound('Tweet not found.');

  switch (action) {
    case 'LIKE':
      await prisma.like.upsert({
        where: { user_id_tweet_id: { user_id: userId, tweet_id: tweetId } },
        create: { user_id: userId, tweet_id: tweetId },
        update: {},
      });
      await createNotification({
        recipientId: tweet.author_id,
        actorId: userId,
        type: 'LIKE',
        tweetId,
      });
      break;
    case 'UNLIKE':
      await prisma.like.deleteMany({ where: { user_id: userId, tweet_id: tweetId } });
      await removeNotification({
        recipientId: tweet.author_id,
        actorId: userId,
        type: 'LIKE',
        tweetId,
      });
      break;
    case 'REPOST':
      await prisma.repost.upsert({
        where: { user_id_tweet_id: { user_id: userId, tweet_id: tweetId } },
        create: { user_id: userId, tweet_id: tweetId },
        update: {},
      });
      await createNotification({
        recipientId: tweet.author_id,
        actorId: userId,
        type: 'REPOST',
        tweetId,
      });
      break;
    case 'UNREPOST':
      await prisma.repost.deleteMany({ where: { user_id: userId, tweet_id: tweetId } });
      await removeNotification({
        recipientId: tweet.author_id,
        actorId: userId,
        type: 'REPOST',
        tweetId,
      });
      break;
    case 'BOOKMARK':
      await prisma.bookmark.upsert({
        where: { user_id_tweet_id: { user_id: userId, tweet_id: tweetId } },
        create: { user_id: userId, tweet_id: tweetId },
        update: {},
      });
      break;
    case 'UNBOOKMARK':
      await prisma.bookmark.deleteMany({ where: { user_id: userId, tweet_id: tweetId } });
      break;
    default:
      throw AppError.badRequest(`Unknown action: ${action}`);
  }
}

// ─── Profile tabs ────────────────────────────────────────────────────────────

async function getAuthoredTweets(
  authorId: string,
  viewerId: string,
  tab: Exclude<ProfileTweetTab, 'reposts'>,
  cursor?: string,
) {
  const limit = FEED_PAGE_SIZE;

  const filter =
    tab === 'posts'
      ? topLevelTweetWhere
      : tab === 'replies'
        ? { NOT: topLevelTweetWhere }
        : { media: { some: {} } };

  const tweets = await prisma.tweet.findMany({
    where: {
      author_id: authorId,
      ...filter,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: tweetInclude(viewerId),
  });

  return paginate((tweets as TweetWithRelations[]).map(formatTweet), limit);
}

async function getRepostedTweets(username: string, viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw AppError.notFound('User not found.');

  // Reposts are paginated by the Repost row id, not the tweet id, so a user
  // reposting the same tweet twice in different sessions still paginates well.
  const reposts = await prisma.repost.findMany({
    where: {
      user_id: user.id,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: {
      tweet: { include: tweetInclude(viewerId) },
    },
  });

  const data = reposts.map((repost) =>
    formatRepost(repost.tweet as TweetWithRelations, user),
  );

  return {
    data,
    next_cursor: reposts.length === limit ? reposts[reposts.length - 1].id : null,
  };
}

export async function getTweetsByUser(
  username: string,
  viewerId: string,
  cursor?: string,
  tab: ProfileTweetTab = 'posts',
) {
  if (tab === 'reposts') return getRepostedTweets(username, viewerId, cursor);

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw AppError.notFound('User not found.');

  return getAuthoredTweets(user.id, viewerId, tab, cursor);
}
