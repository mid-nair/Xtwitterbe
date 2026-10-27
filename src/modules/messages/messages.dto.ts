import { z } from 'zod';

export const openConversationSchema = z.object({
  user_id: z.string().min(1, 'A user is required.'),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(1000, 'Message must be at most 1000 characters.'),
});

export type OpenConversationDto = z.infer<typeof openConversationSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
