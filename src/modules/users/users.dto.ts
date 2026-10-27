import { z } from 'zod';

const optionalUrl = z
  .union([z.string().url('Enter a valid URL.').max(500), z.literal('')])
  .optional();

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(50, 'Display name must be at most 50 characters.')
    .optional(),
  bio: z.string().max(160, 'Bio must be at most 160 characters.').optional(),
  location: z.string().max(30, 'Location must be at most 30 characters.').optional(),
  website_url: optionalUrl,
  avatar_url: optionalUrl,
  banner_url: optionalUrl,
});

export const searchUsersSchema = z.object({
  q: z.string().trim().max(100).default(''),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersSchema>;
