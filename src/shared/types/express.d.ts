/**
 * Augment Express's Request to carry the authenticated user after the
 * auth middleware resolves the JWT.
 */

import type { TokenPayload } from '@/shared/utils/token';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware after verifying the JWT. */
      user?: TokenPayload;
    }
  }
}
