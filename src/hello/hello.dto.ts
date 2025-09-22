import { z } from 'zod';

export const HelloResponseSchema = z.object({
  message: z.string(),
  timestamp: z.date(),
});

export type HelloResponseDto = z.infer<typeof HelloResponseSchema>;