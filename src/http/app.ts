import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { resolve } from 'node:path';
import { corsOrigins } from '../config/env.js';
import { logger } from '../logger.js';
import { routes } from './routes.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed.');
    error.name = 'CorsOriginError';
    return callback(error);
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use(express.static(resolve(process.cwd(), 'public'), {
  extensions: ['html'],
  index: 'index.html',
}));
app.use(routes);
app.use((_request, response) => {
  response.status(404).json({ success: false, message: 'Endpoint not found.' });
});
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error && error.name === 'CorsOriginError') {
    response.status(403).json({ success: false, message: 'Origin is not allowed.' });
    return;
  }
  logger.error({ err: error }, 'Unhandled HTTP error');
  response.status(500).json({ success: false, message: 'Internal server error.' });
});
