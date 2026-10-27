import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';

export interface TokenPayload {
  sub: string; // user id
  username: string;
}

/** Sign a JWT for the given user. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Verify and decode a JWT. Throws AppError(401) on failure. */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.jwt.secret) as TokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired token.');
  }
}
