import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/config/constants';

/** Hash a plain-text password with bcrypt. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Compare a plain-text password against a stored hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
