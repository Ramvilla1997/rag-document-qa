import { AppError } from '../errors.js';
import { tokenize } from '../retrieval/bm25.js';

export interface Passage {
  label: number;
  documentTitle: string;
  text: string;
}

export interface AnswerGenerator {
  readonly name: string;
  generate(question: string, passages: Passage[]): Promise<string>;
}

const NO_MATCH_ANSWER = 'I could not find anything in the uploaded documents that answers that question.';

export class ExtractiveGenerator implements AnswerGenerator {
  readonly name = 'extractive';

  async generate(question: string, passages: Passage[]): Promise<string> {
    const [best] = passages;
    if (!best) {
      return NO_MATCH_ANSWER;
    }
    return `${bestSentence(question, best.text)} [${best.label}]`;
  }
}

function bestSentence(question: string, text: string): string {
  const questionTerms = new Set(tokenize(question));
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];

  let bestScore = -1;
  let best = sentences[0] ?? text;
  for (const sentence of sentences) {
    const overlap = tokenize(sentence).filter((term) => questionTerms.has(term)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = sentence;
    }
  }
  return best.trim();
}

export class OllamaGenerator implements AnswerGenerator {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async generate(question: string, passages: Passage[]): Promise<string> {
    if (passages.length === 0) {
      return NO_MATCH_ANSWER;
    }

    const context = passages
      .map((passage) => `[${passage.label}] (${passage.documentTitle}) ${passage.text}`)
      .join('\n');

    const prompt = [
      'Answer the question using only the context below.',
      'Cite the passage number in square brackets after each claim, for example [2].',
      'If the context does not contain the answer, say so.',
      '',
      `Context:\n${context}`,
      '',
      `Question: ${question}`,
    ].join('\n');

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, stream: false }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new AppError(502, 'The language model is unavailable', { cause: error });
    }

    if (!response.ok) {
      throw new AppError(502, 'The language model returned an error');
    }

    const body = (await response.json()) as { response?: unknown };
    if (typeof body.response !== 'string') {
      throw new AppError(502, 'The language model returned an unexpected response');
    }
    return body.response.trim();
  }
}
