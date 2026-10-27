import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import { getForYouTimeline, getFollowingTimeline } from './timeline.service';
import type { PaginationQuery } from '@/modules/tweets/tweets.dto';

// GET /api/v1/timeline/home?feed_type=for_you|following&cursor=...
export async function homeTimelineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const query = req.query as PaginationQuery & { feed_type?: string };
    const { cursor, feed_type } = query;

    const feed =
      feed_type === 'following'
        ? await getFollowingTimeline(sub, cursor)
        : await getForYouTimeline(sub, cursor);

    res.json(feed);
  } catch (err) {
    next(err);
  }
}
