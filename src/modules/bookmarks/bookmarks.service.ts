import { prisma } from '@/config/database';
import { formatTweet, tweetInclude, type TweetWithRelations } from '@/modules/tweets/tweet.mapper';
import { FEED_PAGE_SIZE } from '@/config/constants';

export async function getBookmarks(viewerId: string, cursor?: string) {
  const limit = FEED_PAGE_SIZE;

  // Order by when the bookmark was created (X shows most recently saved first)
  // and paginate by the Bookmark id, which is opaque to the client.
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      user_id: viewerId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: {
      tweet: { include: tweetInclude(viewerId) },
    },
  });

  const data = bookmarks.map((bookmark) =>
    formatTweet(bookmark.tweet as TweetWithRelations),
  );

  const hasMore = bookmarks.length === limit;
  return {
    data,
    next_cursor: hasMore ? bookmarks[bookmarks.length - 1].id : null,
  };
}
