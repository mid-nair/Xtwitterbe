import { prisma } from '@/config/database';
import { paginate } from '@/shared/utils/pagination';
import { topLevelTweetWhere } from '@/shared/utils/tweetFilters';
import { formatTweet, tweetInclude, type TweetWithRelations } from '@/modules/tweets/tweet.mapper';
import { FEED_PAGE_SIZE } from '@/config/constants';

/**
 * For You feed — all top-level tweets sorted by recency.
 * Algorithmic ranking can be layered here later without touching controllers.
 */
export async function getForYouTimeline(viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;
  const tweets = await prisma.tweet.findMany({
    where: {
      ...topLevelTweetWhere,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: tweetInclude(viewerId),
  });

  return paginate((tweets as TweetWithRelations[]).map(formatTweet), limit);
}

/** Following feed — top-level tweets from users the viewer follows. */
export async function getFollowingTimeline(viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;

  const follows = await prisma.follow.findMany({
    where: { follower_id: viewerId },
    select: { following_id: true },
  });
  const followingIds = follows.map((f) => f.following_id);

  // Following nobody means an empty Following feed (not the global feed).
  if (followingIds.length === 0) {
    return { data: [], next_cursor: null };
  }

  const tweets = await prisma.tweet.findMany({
    where: {
      author_id: { in: followingIds },
      ...topLevelTweetWhere,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: tweetInclude(viewerId),
  });

  return paginate((tweets as TweetWithRelations[]).map(formatTweet), limit);
}
