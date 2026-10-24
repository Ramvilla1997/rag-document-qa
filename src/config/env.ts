import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    LLM_PROVIDER: z.enum(['extractive', 'ollama']).default('extractive'),
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().min(1).default('llama3.2'),
    CHUNK_SIZE_WORDS: z.coerce.number().int().positive().default(120),
    CHUNK_OVERLAP_WORDS: z.coerce.number().int().nonnegative().default(20),
    TOP_K: z.coerce.number().int().positive().max(20).default(4),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  })
  .refine((env) => env.CHUNK_OVERLAP_WORDS < env.CHUNK_SIZE_WORDS, {
    message: 'CHUNK_OVERLAP_WORDS must be smaller than CHUNK_SIZE_WORDS',
    path: ['CHUNK_OVERLAP_WORDS'],
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}
