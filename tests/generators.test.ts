import { describe, expect, it } from 'vitest';
import { ExtractiveGenerator, OllamaGenerator } from '../src/llm/generators.js';

describe('ExtractiveGenerator', () => {
  it('returns the sentence that best matches the question, with its citation', async () => {
    const answer = await new ExtractiveGenerator().generate('How long do tokens last?', [
      {
        label: 1,
        documentTitle: 'API',
        text: 'All requests need a bearer token. Tokens expire after 90 days. Page size is 50.',
      },
    ]);
    expect(answer).toBe('Tokens expire after 90 days. [1]');
  });

  it('says so when no passages were found', async () => {
    const answer = await new ExtractiveGenerator().generate('anything', []);
    expect(answer).toMatch(/could not find/);
  });
});

describe('OllamaGenerator', () => {
  it('maps an unreachable model server to a 502 without exposing the cause', async () => {
    const failingFetch = (() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch;
    const generator = new OllamaGenerator('http://ollama.invalid', 'llama3.2', failingFetch);
    await expect(
      generator.generate('q', [{ label: 1, documentTitle: 'T', text: 'some text' }]),
    ).rejects.toMatchObject({ status: 502, publicMessage: 'The language model is unavailable' });
  });
});
