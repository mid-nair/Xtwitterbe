import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '@/shared/errors/AppError';
import { env } from '@/config/env';

/**
 * Global error-handling middleware.
 * Must be registered LAST (after all routes) in the Express app.
 *
 * - AppError (operational) → structured JSON response with the correct status code
 * - Unknown errors         → 500 with stack trace in dev, generic message in prod
 */
/**
 * Errors raised when the database cannot be reached (Atlas IP allowlist,
 * network outage, cluster paused, etc.). These surface after a long server
 * selection timeout, so report them as 503 without leaking connection details.
 */
function isDatabaseConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Server selection timeout|No available servers|Can't reach database server|received fatal alert|P1001/i.test(
    message,
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const isVideo = err.field === 'video';
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? isVideo
          ? 'Video must be 50MB or smaller.'
          : 'Image must be 5MB or smaller.'
        : isVideo
          ? 'Video upload failed.'
          : 'Image upload failed.';
    res.status(400).json({ message });
    return;
  }

  if (isDatabaseConnectionError(err)) {
    console.error('[DatabaseConnectionError]', err instanceof Error ? err.message : err);
    res.status(503).json({
      message: 'Database is unavailable right now. Please try again in a moment.',
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }

  // Unexpected / programming error
  const message = env.isDev && err instanceof Error ? err.message : 'Internal server error.';
  if (env.isDev) console.error('[UnhandledError]', err);

  res.status(500).json({ message });
}

/**
 * 404 fallback — registered after all routes but before errorHandler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
