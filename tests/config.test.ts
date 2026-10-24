import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

describe('loadEnv', () => {
  it('applies safe defaults when nothing is set', () => {
    const env = loadEnv({});
    expect(env.PORT).toBe(3000);
    expect(env.LLM_PROVIDER).toBe('extractive');
  });

  it('rejects an overlap that is not smaller than the chunk size', () => {
    expect(() => loadEnv({ CHUNK_SIZE_WORDS: '10', CHUNK_OVERLAP_WORDS: '10' })).toThrow(/CHUNK_OVERLAP_WORDS/);
  });

  it('rejects an unknown LLM provider', () => {
    expect(() => loadEnv({ LLM_PROVIDER: 'openai' })).toThrow(/LLM_PROVIDER/);
  });
});
