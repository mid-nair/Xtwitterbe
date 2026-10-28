import { z } from 'zod';
import { MAX_TWEET_LENGTH } from '@/config/constants';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.');

export const MAX_MEDIA_PER_TWEET = 4;

export const createTweetSchema = z
  .object({
    // Text is optional when the post carries media (e.g. a video-only post).
    content: z
      .string()
      .trim()
      .max(MAX_TWEET_LENGTH, `Tweet cannot exceed ${MAX_TWEET_LENGTH} characters.`)
      .default(''),
    reply_to_tweet_id: objectId.nullable().default(null),
    quote_tweet_id: objectId.nullable().default(null),
    media_urls: z
      .array(z.string().url('Invalid media URL.').max(2000))
      .max(MAX_MEDIA_PER_TWEET, `You can attach at most ${MAX_MEDIA_PER_TWEET} media files.`)
      .default([]),
  })
  .refine((dto) => dto.content.length > 0 || dto.media_urls.length > 0, {
    message: 'Tweet content cannot be empty.',
    path: ['content'],
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
