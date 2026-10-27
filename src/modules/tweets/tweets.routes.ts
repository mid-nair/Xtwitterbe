import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { createTweetSchema, engageTweetSchema } from './tweets.dto';
import {
  createTweetHandler,
  engageTweetHandler,
  getTweetDetailHandler,
  getTweetRepliesHandler,
} from './tweets.controller';

const router = Router();

router.use(authenticate);

/**
 * POST /api/v1/tweets
 * Create a new tweet (or reply / quote-tweet).
 */
router.post('/', validate(createTweetSchema), createTweetHandler);

/**
 * GET /api/v1/tweets/:tweetId
 * A single tweet plus its immediate parent (thread context).
 */
router.get('/:tweetId', getTweetDetailHandler);

/**
 * GET /api/v1/tweets/:tweetId/replies
 * Cursor-paginated direct replies, oldest first.
 */
router.get('/:tweetId/replies', getTweetRepliesHandler);

/**
 * POST /api/v1/tweets/:tweetId/engage
 * Like, unlike, repost, unrepost, bookmark, or unbookmark a tweet.
 */
router.post('/:tweetId/engage', validate(engageTweetSchema), engageTweetHandler);

export default router;
