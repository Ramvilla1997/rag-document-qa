import { z } from 'zod';

export const documentInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(200_000),
});

export const questionInputSchema = z.object({
  question: z.string().trim().min(3).max(1000),
});
