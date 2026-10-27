import { prisma } from '@/config/database';
import { paginate } from '@/shared/utils/pagination';
import { topLevelTweetWhere } from '@/shared/utils/tweetFilters';
import { formatTweet, tweetInclude, type TweetWithRelations } from '@/modules/tweets/tweet.mapper';
import { FEED_PAGE_SIZE } from '@/config/constants';

/**
 * Search posts by content. With an empty query we fall back to the latest
 * top-level posts so Explore always has something useful to show.
 */
export async function searchTweets(query: string, viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;
  const q = query.trim();

  const tweets = await prisma.tweet.findMany({
    where: {
      ...(q
        ? { content: { contains: q, mode: 'insensitive' as const } }
        : topLevelTweetWhere),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: tweetInclude(viewerId),
  });

  return paginate((tweets as TweetWithRelations[]).map(formatTweet), limit);
}
