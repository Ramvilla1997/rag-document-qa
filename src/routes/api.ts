import { Router } from 'express';
import type { QaService } from '../services/qaService.js';
import { AppError } from '../errors.js';
import { documentInputSchema, questionInputSchema } from './schemas.js';

export function createApiRouter(service: QaService): Router {
  const router = Router();

  router.get('/health', (_request, response) => {
    response.json({ status: 'ok', generator: service.generatorName });
  });

  router.get('/documents', (_request, response) => {
    response.json({ documents: service.listDocuments() });
  });

  router.post('/documents', (request, response) => {
    const parsed = documentInputSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid document: provide a title and text');
    }
    const document = service.ingestDocument(parsed.data.title, parsed.data.text);
    response.status(201).json({ document });
  });

  router.post('/questions', async (request, response) => {
    const parsed = questionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid question: provide a question of 3 to 1000 characters');
    }
    const result = await service.ask(parsed.data.question);
    response.json(result);
  });

  return router;
}
