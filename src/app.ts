import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Env } from './config/env.js';
import type { QaService } from './services/qaService.js';
import { createApiRouter } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

export interface AppDependencies {
  env: Pick<Env, 'RATE_LIMIT_PER_MINUTE'>;
  service: QaService;
}

export function createApp({ env, service }: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: env.RATE_LIMIT_PER_MINUTE,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );
  app.use('/api', createApiRouter(service));
  app.use(errorHandler);
  return app;
}
