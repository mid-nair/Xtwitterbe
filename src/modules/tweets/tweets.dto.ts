import { z } from 'zod';
import { MAX_TWEET_LENGTH } from '@/config/constants';

export const createTweetSchema = z.object({
  content: z
    .string()
    .min(1, 'Tweet content cannot be empty.')
    .max(MAX_TWEET_LENGTH, `Tweet cannot exceed ${MAX_TWEET_LENGTH} characters.`),
  reply_to_tweet_id: z.string().nullable().default(null),
  quote_tweet_id: z.string().nullable().default(null),
  media_urls: z.array(z.string().url('Invalid media URL.')).default([]),
});

export const engageTweetSchema = z.object({
  action: z.enum(['LIKE', 'UNLIKE', 'REPOST', 'UNREPOST', 'BOOKMARK', 'UNBOOKMARK'], {
    errorMap: () => ({ message: 'Invalid engagement action.' }),
  }),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateTweetDto = z.infer<typeof createTweetSchema>;
export type EngageTweetDto = z.infer<typeof engageTweetSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
