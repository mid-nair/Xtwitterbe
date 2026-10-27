import type { Prisma } from '@prisma/client';

/**
 * Matches tweets that are not replies (i.e. top-level tweets).
 *
 * MongoDB stores unset optional fields as *absent*, not `null`, and Prisma's
 * `{ field: null }` filter does not match absent fields. Match both cases so
 * this works whether a tweet was created with an explicit `null` or with the
 * field omitted.
 */
export const topLevelTweetWhere: Prisma.TweetWhereInput = {
  OR: [{ reply_to_tweet_id: null }, { reply_to_tweet_id: { isSet: false } }],
};
