const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'to', 'was', 'what', 'when', 'where', 'which', 'who',
  'with', 'how', 'does', 'do',
]);

export interface IndexedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  text: string;
}

export interface ScoredChunk extends IndexedChunk {
  score: number;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

const K1 = 1.2;
const B = 0.75;

export class Bm25Index {
  private readonly chunks: IndexedChunk[] = [];
  private readonly termFrequencies: Map<string, Map<string, number>> = new Map();
  private readonly lengths: number[] = [];
  private readonly documentFrequency: Map<string, number> = new Map();
  private totalLength = 0;

  add(chunk: IndexedChunk): void {
    const tokens = tokenize(chunk.text);
    const frequencies = new Map<string, number>();
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
    for (const token of frequencies.keys()) {
      this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
    }

    this.termFrequencies.set(chunk.id, frequencies);
    this.lengths.push(tokens.length);
    this.totalLength += tokens.length;
    this.chunks.push(chunk);
  }

  search(query: string, limit: number): ScoredChunk[] {
    const queryTerms = [...new Set(tokenize(query))];
    if (queryTerms.length === 0 || this.chunks.length === 0) {
      return [];
    }

    const averageLength = this.totalLength / this.chunks.length;
    const scored: ScoredChunk[] = [];

    this.chunks.forEach((chunk, position) => {
      const frequencies = this.termFrequencies.get(chunk.id);
      if (!frequencies) {
        return;
      }
      const length = this.lengths[position];
      let score = 0;
      for (const term of queryTerms) {
        const frequency = frequencies.get(term) ?? 0;
        if (frequency === 0) {
          continue;
        }
        const documentCount = this.documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (this.chunks.length - documentCount + 0.5) / (documentCount + 0.5));
        const normalization = K1 * (1 - B + (B * length) / averageLength);
        score += idf * ((frequency * (K1 + 1)) / (frequency + normalization));
      }
      if (score > 0) {
        scored.push({ ...chunk, score });
      }
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  get size(): number {
    return this.chunks.length;
  }
}
