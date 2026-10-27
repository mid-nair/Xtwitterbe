import { z } from 'zod';
import { USERNAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/config/constants';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
  username: z
    .string()
    .min(1, 'Username is required.')
    .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters.`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  display_name: z
    .string()
    .min(1, 'Display name is required.')
    .max(50, 'Display name must be at most 50 characters.'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
