import type { Request, Response, NextFunction } from 'express';
import { requireUser } from '@/middleware/auth.middleware';
import { searchTweets } from './explore.service';
import { searchUsers } from '@/modules/users/users.service';

// GET /api/v1/explore/tweets?q=&cursor=
export async function searchTweetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { q, cursor } = req.query as { q?: string; cursor?: string };
    const page = await searchTweets(q ?? '', sub, cursor);
    res.json(page);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/explore/users?q=
export async function searchUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub } = requireUser(req);
    const { q } = req.query as { q?: string };
    const users = await searchUsers(q ?? '', sub);
    res.json(users);
  } catch (err) {
    next(err);
  }
}
