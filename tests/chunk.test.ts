import { describe, expect, it } from 'vitest';
import { chunkText } from '../src/ingest/chunk.js';

describe('chunkText', () => {
  it('returns no chunks for blank input', () => {
    expect(chunkText('   ', 10, 2)).toEqual([]);
  });

  it('keeps short text in a single chunk', () => {
    expect(chunkText('one two three', 10, 2)).toEqual([{ index: 0, text: 'one two three' }]);
  });

  it('overlaps adjacent chunks by the configured number of words', () => {
    const text = 'a b c d e f g h';
    const chunks = chunkText(text, 4, 2);
    expect(chunks.map((chunk) => chunk.text)).toEqual(['a b c d', 'c d e f', 'e f g h']);
  });

  it('does not emit a trailing chunk that is already covered', () => {
    const chunks = chunkText('a b c d e f', 4, 2);
    expect(chunks.map((chunk) => chunk.text)).toEqual(['a b c d', 'c d e f']);
  });
});
