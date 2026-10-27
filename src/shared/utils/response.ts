import type { Response } from 'express';

/** Send a consistent success JSON envelope. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(data);
}

/** Send a consistent error JSON envelope. */
export function sendError(res: Response, message: string, statusCode = 500): void {
  res.status(statusCode).json({ message });
}
