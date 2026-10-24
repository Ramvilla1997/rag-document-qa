import { describe, expect, it } from 'vitest';
import { Bm25Index } from '../src/retrieval/bm25.js';

function buildIndex(): Bm25Index {
  const index = new Bm25Index();
  index.add({ id: 'a:0', documentId: 'a', documentTitle: 'Policy', text: 'Vacation requests need manager approval.' });
  index.add({ id: 'b:0', documentId: 'b', documentTitle: 'API', text: 'Tokens expire after ninety days.' });
  index.add({ id: 'c:0', documentId: 'c', documentTitle: 'Runbook', text: 'Roll back the release when errors spike.' });
  return index;
}

describe('Bm25Index', () => {
  it('ranks the chunk containing the query terms first', () => {
    const [top] = buildIndex().search('when do API tokens expire', 3);
    expect(top?.documentTitle).toBe('API');
  });

  it('returns nothing when the query has no indexable terms', () => {
    expect(buildIndex().search('the of and', 3)).toEqual([]);
  });

  it('returns nothing for terms that never appear', () => {
    expect(buildIndex().search('kubernetes', 3)).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(buildIndex().search('errors release approval tokens', 2)).toHaveLength(2);
  });
});
