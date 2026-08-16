import { getJobsCollection } from './utils/mongo';
import { v4 as uuidv4 } from 'uuid';
import { runInContainer } from './utils/runner';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const DEFAULT_ENV = process.env.DEFAULT_ENVIRONMENT || 'python-dsa';

export async function processSubmissionEvent(submission: any) {
  const jobId = uuidv4();
  const jobs = getJobsCollection();
  const jobDoc: any = {
    _id: jobId,
    submission_id: submission.id,
    submitter_id: submission.submitter_id,
    assessment_id: submission.assessment_id || null,
    practical_id: submission.practical_id || null,
    status: 'queued',
    created_at: new Date(),
    updated_at: new Date(),
    logs: [],
    artifacts: []
  };
  await jobs.insertOne(jobDoc);

  const envSlug = submission.metadata?.environment || DEFAULT_ENV;
  const imageMap: Record<string,string> = {
    'python-dsa': 'vpl-python-dsa:1.0',
    'cpp-gcc': 'vpl-cpp-runner:1.0',
    'postgres-dbms': 'vpl-postgres-runner:1.0',
    'jupyter-ml': 'vpl-jupyter-ml:1.0'
  };
  const image = imageMap[envSlug] || imageMap[DEFAULT_ENV];

  await jobs.updateOne({ _id: jobId }, { $set: { status: 'running', started_at: new Date(), image } });

  const opts = {
    jobId,
    workspaceDir: `/tmp/execution/${jobId}`,
    image,
    runCommand: submission.metadata?.run_command || 'python3 main.py',
    timeLimitSec: submission.metadata?.time_limit_sec || 30,
    memoryMb: submission.metadata?.memory_mb || 512
  } as any;

  try {
    await runInContainer(opts, async (chunk: string) => {
      await jobs.updateOne({ _id: jobId }, { $push: { logs: { ts: new Date(), line: chunk } }, $set: { updated_at: new Date() } });
    });
    await jobs.updateOne({ _id: jobId }, { $set: { status: 'completed', completed_at: new Date(), updated_at: new Date() } });
    // publish execution.completed
    if (REDIS_URL) {
      const redis = new IORedis(REDIS_URL);
      await redis.publish('execution.events', JSON.stringify({ type: 'execution.completed', data: { jobId, submission_id: submission.id } }));
      redis.disconnect();
    }
  } catch (err: any) {
    await jobs.updateOne({ _id: jobId }, { $set: { status: 'failed', error: String(err), updated_at: new Date() } });
    if (REDIS_URL) {
      const redis = new IORedis(REDIS_URL);
      await redis.publish('execution.events', JSON.stringify({ type: 'execution.failed', data: { jobId, submission_id: submission.id, error: String(err) } }));
      redis.disconnect();
    }
  }
}
