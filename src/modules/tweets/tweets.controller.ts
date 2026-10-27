import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import * as tweetsService from './tweets.service';
import type { CreateTweetDto } from './tweets.dto';
import type { ProfileTweetTab } from './tweets.service';

// POST /api/v1/tweets
export async function createTweetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const tweet = await tweetsService.createTweet(req.body as CreateTweetDto, sub);
    res.status(201).json(tweet);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/tweets/:tweetId/engage
export async function engageTweetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    await tweetsService.engageTweet((req.params as any).tweetId, (req.body as any).action, sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/tweets/:tweetId
export async function getTweetDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const detail = await tweetsService.getTweetDetail((req.params as any).tweetId, sub);
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/tweets/:tweetId/replies?cursor=...
export async function getTweetRepliesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor } = req.query as { cursor?: string };
    const page = await tweetsService.getTweetReplies(
      (req.params as any).tweetId,
      sub,
      cursor,
    );
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:username/tweets?tab=posts|replies|media|reposts&cursor=
export async function getUserTweetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { cursor, tab } = req.query as { cursor?: string; tab?: ProfileTweetTab };
    const validTabs: ProfileTweetTab[] = ['posts', 'replies', 'media', 'reposts'];
    const selectedTab = tab && validTabs.includes(tab) ? tab : 'posts';
    const feed = await tweetsService.getTweetsByUser(
      (req.params as any).username,
      sub,
      cursor,
      selectedTab,
    );
    res.json(feed);
  } catch (err) {
    next(err);
  }
}
