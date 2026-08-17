import dotenv from 'dotenv';
dotenv.config();
import IORedis from 'ioredis';
import { connectMongo } from './utils/mongo';
import { initDb } from './utils/db';
import { handleExecutionCompleted } from './worker';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vpl_logs';

async function main() {
  console.log('[Assessment Grader] Initializing worker...');
  await connectMongo(MONGO_URI);
  await initDb();

  const sub = new IORedis(REDIS_URL, { lazyConnect: true });
  sub.connect().then(() => {
    sub.subscribe('execution.events', (err) => {
      if (err) console.error('[Assessment Grader] Subscribe error on execution.events:', err);
      else console.log('[Assessment Grader] Subscribed to execution.events');
    });

    sub.on('message', async (_channel, message) => {
      try {
        const ev = JSON.parse(message);
        if (!ev || !ev.type) return;
        if (ev.type === 'execution.completed' || ev.type === 'execution.failed') {
          await handleExecutionCompleted(ev.data, ev.type);
        }
      } catch (err) {
        console.error('[Assessment Grader] Message handling error:', err);
      }
    });
  }).catch((err) => {
    console.warn('[Assessment Grader] Redis connection warning:', err.message);
  });

  console.log('[Assessment Grader] Worker started');
}

main().catch((err) => {
  console.error('[Assessment Grader] Fatal startup error:', err);
  process.exit(1);
});
