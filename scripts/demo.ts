import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bm25Index, ExtractiveGenerator, QaService } from '../src/index.js';

const sampleDirectory = join(dirname(fileURLToPath(import.meta.url)), 'sample');
const questions = [
  'How many days can I work remotely each week?',
  'How long do API tokens last?',
  'What should I do when the 5xx error rate is high?',
];

const service = new QaService(
  { chunkSizeWords: 40, chunkOverlapWords: 8, topK: 2 },
  new Bm25Index(),
  new ExtractiveGenerator(),
);

for (const file of readdirSync(sampleDirectory)) {
  const title = basename(file, '.txt');
  const summary = service.ingestDocument(title, readFileSync(join(sampleDirectory, file), 'utf8'));
  console.log(`Indexed "${summary.title}" into ${summary.chunkCount} chunks`);
}

for (const question of questions) {
  const result = await service.ask(question);
  console.log(`\nQ: ${question}`);
  console.log(`A: ${result.answer}`);
  for (const citation of result.citations) {
    console.log(`   [${citation.label}] ${citation.documentTitle} (chunk ${citation.chunkIndex}, score ${citation.score})`);
  }
}
