import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import { getBookmarks } from './bookmarks.service';
import type { PaginationQuery } from '@/modules/tweets/tweets.dto';

// GET /api/v1/bookmarks
export async function getBookmarksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const query = req.query as PaginationQuery;
    const feed = await getBookmarks(sub, query.cursor);
    res.json(feed);
  } catch (err) {
    next(err);
  }
}
