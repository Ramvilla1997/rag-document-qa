import { randomUUID } from 'node:crypto';
import { chunkText } from '../ingest/chunk.js';
import { Bm25Index } from '../retrieval/bm25.js';
import type { AnswerGenerator, Passage } from '../llm/generators.js';
import { AppError } from '../errors.js';

export interface QaServiceOptions {
  chunkSizeWords: number;
  chunkOverlapWords: number;
  topK: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

export interface Citation {
  label: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
}

export interface Answer {
  answer: string;
  citations: Citation[];
}

const EXCERPT_CHARACTERS = 240;

export class QaService {
  private readonly documents = new Map<string, DocumentSummary>();

  constructor(
    private readonly options: QaServiceOptions,
    private readonly index: Bm25Index,
    private readonly generator: AnswerGenerator,
  ) {}

  ingestDocument(title: string, text: string): DocumentSummary {
    const chunks = chunkText(text, this.options.chunkSizeWords, this.options.chunkOverlapWords);
    if (chunks.length === 0) {
      throw new AppError(400, 'Document has no text to index');
    }

    const id = randomUUID();
    for (const chunk of chunks) {
      this.index.add({
        id: `${id}:${chunk.index}`,
        documentId: id,
        documentTitle: title,
        text: chunk.text,
      });
    }

    const summary: DocumentSummary = {
      id,
      title,
      chunkCount: chunks.length,
      createdAt: new Date().toISOString(),
    };
    this.documents.set(id, summary);
    return summary;
  }

  listDocuments(): DocumentSummary[] {
    return [...this.documents.values()];
  }

  async ask(question: string): Promise<Answer> {
    const hits = this.index.search(question, this.options.topK);
    const citations: Citation[] = hits.map((hit, position) => ({
      label: position + 1,
      documentId: hit.documentId,
      documentTitle: hit.documentTitle,
      chunkIndex: Number(hit.id.split(':')[1]),
      excerpt: hit.text.slice(0, EXCERPT_CHARACTERS),
      score: Number(hit.score.toFixed(4)),
    }));

    const passages: Passage[] = hits.map((hit, position) => ({
      label: position + 1,
      documentTitle: hit.documentTitle,
      text: hit.text,
    }));

    const answer = await this.generator.generate(question, passages);
    return { answer, citations };
  }

  get generatorName(): string {
    return this.generator.name;
  }
}
