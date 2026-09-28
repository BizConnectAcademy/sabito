import { createServer } from 'node:http';
import { app } from './http/app.js';
import { attachSocketServer } from './socket/server.js';
import { db, closeDatabase } from './database/pool.js';
import { env } from './config/env.js';
import { logger } from './logger.js';

await db.query('SELECT 1');

const httpServer = createServer(app);
const io = attachSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, knowledgeEngine: 'self-hosted' }, 'Sabito-BCA is listening');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down Sabito-BCA');
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
