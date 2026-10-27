import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/shared/utils/token';
import { AppError } from '@/shared/errors/AppError';

/**
 * `authenticate` — extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to `req.user`.
 *
 * Throws 401 if the token is missing or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('No bearer token provided.');
  }

  const token = header.slice(7); // strip "Bearer "
  (req as any).user = verifyToken(token);
  next();
}

/**
 * `requireUser` — convenience helper that asserts `req.user` is set and
 * returns the typed payload. Use inside controllers that are already behind
 * the `authenticate` middleware.
 */
export function requireUser(req: Request): any {
  if (!(req as any).user) throw AppError.unauthorized();
  return (req as any).user;
}
