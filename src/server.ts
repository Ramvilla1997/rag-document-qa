import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { ExtractiveGenerator, OllamaGenerator, type AnswerGenerator } from './llm/generators.js';
import { Bm25Index } from './retrieval/bm25.js';
import { QaService } from './services/qaService.js';

const env = loadEnv();

const generator: AnswerGenerator =
  env.LLM_PROVIDER === 'ollama'
    ? new OllamaGenerator(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL)
    : new ExtractiveGenerator();

const service = new QaService(
  {
    chunkSizeWords: env.CHUNK_SIZE_WORDS,
    chunkOverlapWords: env.CHUNK_OVERLAP_WORDS,
    topK: env.TOP_K,
  },
  new Bm25Index(),
  generator,
);

const server = createApp({ env, service }).listen(env.PORT, () => {
  console.log(`rag-document-qa listening on port ${env.PORT} (generator: ${generator.name})`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, closing server`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
