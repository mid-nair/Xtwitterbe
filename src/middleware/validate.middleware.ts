import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '@/shared/errors/AppError';

type Target = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates `req[target]` against the
 * given Zod schema and replaces it with the parsed (coerced) result.
 *
 * On failure it converts ZodError field messages into a human-readable string
 * and throws a 400 AppError.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      if (result.error instanceof ZodError) {
        const message = result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw AppError.badRequest(message);
      }
      throw AppError.badRequest('Validation failed.');
    }

    // Assign the parsed (and coerced) value back so the controller sees clean data
    (req as any)[target] = result.data;
    next();
  };
}
