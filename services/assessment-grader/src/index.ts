import dotenv from 'dotenv';
dotenv.config();
import IORedis from 'ioredis';
import { connectMongo } from './utils/mongo';
import { initDb } from './utils/db';
import { handleExecutionCompleted } from './worker';

const REDIS_URL = process.env.REDIS_URL;
const MONGO_URI = process.env.MONGO_URI;

if (!REDIS_URL) { console.error('REDIS_URL required'); process.exit(1); }
if (!MONGO_URI) { console.error('MONGO_URI required'); process.exit(1); }

async function main() {
  await connectMongo(MONGO_URI!);
  await initDb();
  const sub = new IORedis(REDIS_URL!);
  sub.subscribe('execution.events', (err) => {
    if (err) console.error('subscribe err', err); else console.log('subscribed to execution.events');
  });
  sub.on('message', async (_channel, message) => {
    try {
      const ev = JSON.parse(message);
      if (!ev || !ev.type) return;
      if (ev.type === 'execution.completed' || ev.type === 'execution.failed') {
        await handleExecutionCompleted(ev.data, ev.type);
      }
    } catch (err) { console.error('msg handling error', err); }
  });
  console.log('assessment-grader started');
}

main().catch(err => { console.error(err); process.exit(1); });
import './worker';
console.log('Assessment grader worker started');
