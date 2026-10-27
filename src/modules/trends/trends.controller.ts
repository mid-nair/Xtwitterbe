import type { Request, Response, NextFunction } from 'express';
import { getTrends } from './trends.service';

// GET /api/v1/trends
export async function getTrendsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const trends = await getTrends();
    res.json(trends);
  } catch (err) {
    next(err);
  }
}
