import dotenv from 'dotenv';
dotenv.config();
import IORedis from 'ioredis';
import { connectMongo } from './utils/mongo';
import { processSubmissionEvent } from './worker';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error('REDIS_URL is required');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is required');
  process.exit(1);
}

async function main() {
  await connectMongo(MONGO_URI!);
  const sub = new IORedis(REDIS_URL!);
  sub.subscribe('submissions.events', (err, count) => {
    if (err) console.error('subscribe err', err);
    else console.log('subscribed to submissions.events');
  });
  sub.on('message', async (_channel, message) => {
    try {
      const ev = JSON.parse(message);
      if (ev && ev.type === 'submission.created' && ev.data) {
        await processSubmissionEvent(ev.data);
      }
    } catch (err) {
      console.error('failed to handle message', err);
    }
  });
  console.log('execution-runner started');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
import app from './app';

const port = Number(process.env.PORT) || Number(process.env.PORT_EXECUTION_RUNNER) || 4030;
app.listen(port, () => {
  console.log(`Execution runner (API/worker) listening on port ${port}`);
});
