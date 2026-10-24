import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Bm25Index } from '../src/retrieval/bm25.js';
import { ExtractiveGenerator } from '../src/llm/generators.js';
import { QaService } from '../src/services/qaService.js';

function buildApp() {
  const service = new QaService(
    { chunkSizeWords: 50, chunkOverlapWords: 5, topK: 3 },
    new Bm25Index(),
    new ExtractiveGenerator(),
  );
  return createApp({ env: { RATE_LIMIT_PER_MINUTE: 1000 }, service });
}

describe('HTTP API', () => {
  it('reports health and the active generator', async () => {
    const response = await request(buildApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', generator: 'extractive' });
  });

  it('indexes a document and answers a question with citations', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/documents')
      .send({ title: 'API Guide', text: 'Tokens are issued from the developer portal and expire after 90 days.' });
    expect(created.status).toBe(201);

    const answer = await request(app).post('/api/questions').send({ question: 'When do tokens expire?' });
    expect(answer.status).toBe(200);
    expect(answer.body.citations[0].documentTitle).toBe('API Guide');
    expect(answer.body.answer).toContain('[1]');
  });

  it('returns 400 for an invalid document without leaking internals', async () => {
    const response = await request(buildApp()).post('/api/documents').send({ title: '' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid document: provide a title and text' });
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(buildApp())
      .post('/api/questions')
      .set('Content-Type', 'application/json')
      .send('{"question": ');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Request body must be valid JSON' });
  });

  it('sets hardened security headers and hides the framework', async () => {
    const response = await request(buildApp()).get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
