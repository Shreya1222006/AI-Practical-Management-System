import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectMongo } from './utils/mongo';
import { startWorkerQueue, stopWorker } from './worker';

const PORT = Number(process.env.PORT) || Number(process.env.PORT_EXECUTION_RUNNER) || 4030;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vpl_logs';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function bootstrap() {
  console.log('====================================================');
  console.log('  AI Practical Management System - Execution Runner ');
  console.log('====================================================');

  // 1. Connect MongoDB
  await connectMongo(MONGO_URI);

  // 2. Start Redis Queue Worker
  await startWorkerQueue(REDIS_URL);

  // 3. Start Express REST API Server
  const server = app.listen(PORT, () => {
    console.log(`[HTTP] Execution runner listening on port ${PORT}`);
    console.log(`[HTTP] Endpoints available:`);
    console.log(`       - POST http://localhost:${PORT}/execute (or /run)`);
    console.log(`       - GET  http://localhost:${PORT}/jobs/:jobId`);
    console.log(`       - GET  http://localhost:${PORT}/environments`);
    console.log(`       - GET  http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Runner] Shutting down gracefully...');
    stopWorker();
    server.close(() => {
      console.log('[Runner] HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Runner] Fatal startup error:', err);
  process.exit(1);
});
