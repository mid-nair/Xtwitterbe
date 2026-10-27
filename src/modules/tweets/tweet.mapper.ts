import type { Tweet, TweetMedia, User } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * A tweet loaded with every relation the API needs to render it.
 * Viewer-specific relations are filtered to the requesting user so
 * `viewer_context` can be derived without extra queries.
 */
export type TweetWithRelations = Tweet & {
  author: User;
  media: TweetMedia[];
  _count: { likes: number; reposts: number; replies: number; bookmarks: number };
  likes: { user_id: string }[];
  reposts: { user_id: string }[];
  bookmarks: { user_id: string }[];
  reply_to?: {
    id: string;
    author: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>;
  } | null;
};

/** Prisma `include` shared by every feed, search and detail query. */
export function tweetInclude(viewerId: string) {
  return {
    author: true,
    media: true,
    _count: { select: { likes: true, reposts: true, replies: true, bookmarks: true } },
    likes: { where: { user_id: viewerId }, select: { user_id: true } },
    reposts: { where: { user_id: viewerId }, select: { user_id: true } },
    bookmarks: { where: { user_id: viewerId }, select: { user_id: true } },
    reply_to: {
      select: {
        id: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            is_verified: true,
          },
        },
      },
    },
  } satisfies Prisma.TweetInclude;
}

/** Map a fully-loaded Prisma tweet to the public API shape. */
export function formatTweet(tweet: TweetWithRelations) {
  return {
    id: tweet.id,
    content: tweet.content,
    user: {
      id: tweet.author.id,
      username: tweet.author.username,
      display_name: tweet.author.display_name,
      avatar_url: tweet.author.avatar_url,
      is_verified: tweet.author.is_verified,
    },
    reply_to_tweet_id: tweet.reply_to_tweet_id ?? null,
    reply_to_user: tweet.reply_to
      ? {
          id: tweet.reply_to.author.id,
          username: tweet.reply_to.author.username,
          display_name: tweet.reply_to.author.display_name,
          avatar_url: tweet.reply_to.author.avatar_url,
          is_verified: tweet.reply_to.author.is_verified,
        }
      : null,
    media_urls: tweet.media.map((m) => m.url),
    stats: {
      likes: tweet._count.likes,
      reposts: tweet._count.reposts,
      replies: tweet._count.replies,
      bookmarks: tweet._count.bookmarks,
    },
    viewer_context: {
      liked: tweet.likes.length > 0,
      reposted: tweet.reposts.length > 0,
      bookmarked: tweet.bookmarks.length > 0,
    },
    created_at: tweet.created_at.toISOString(),
  };
}

/** Attach the user who reposted a tweet (used by the Reposts tab). */
export function formatRepost(
  tweet: TweetWithRelations,
  reposter: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>,
) {
  return {
    ...formatTweet(tweet),
    reposted_by: {
      id: reposter.id,
      username: reposter.username,
      display_name: reposter.display_name,
      avatar_url: reposter.avatar_url,
      is_verified: reposter.is_verified,
    },
  };
}
