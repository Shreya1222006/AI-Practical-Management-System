import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { executeInSandbox } from './executor';
import { resolveEnvironment } from './environments';
import { JobStore } from './utils/mongo';
import { CodeExecutionRequest, ExecutionJobDoc, ExecutionResult } from './types';

let redisPublisher: IORedis | null = null;
let isWorkerRunning = false;

export function initRedisPublisher(redisUrl: string) {
  try {
    redisPublisher = new IORedis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redisPublisher.connect().catch((err) => {
      console.warn('[Redis] Publisher connection warning:', err.message);
    });
  } catch (err: any) {
    console.warn('[Redis] Publisher init error:', err.message);
  }
}

async function publishEvent(channel: string, event: object) {
  if (redisPublisher && redisPublisher.status === 'ready') {
    try {
      await redisPublisher.publish(channel, JSON.stringify(event));
    } catch (e: any) {
      console.warn(`[Redis] Failed to publish on ${channel}:`, e.message);
    }
  }
}

/**
 * Execute a single job end-to-end
 */
export async function executeJob(jobData: CodeExecutionRequest & { jobId?: string }): Promise<ExecutionResult> {
  const jobId = jobData.jobId || uuidv4();
  const env = resolveEnvironment(jobData.environment || jobData.language);

  // Initialize or fetch existing doc
  let doc = await JobStore.get(jobId);
  if (!doc) {
    doc = {
      _id: jobId,
      submission_id: jobData.submission_id || null,
      submitter_id: jobData.submitter_id || null,
      assessment_id: jobData.assessment_id || null,
      practical_id: jobData.practical_id || null,
      language: env.language,
      environment: env.slug,
      image: env.dockerImage,
      code: jobData.code || '',
      status: 'queued',
      created_at: new Date(),
      updated_at: new Date(),
      logs: [],
      artifacts: []
    };
    await JobStore.insert(doc);
  }

  // Update to running
  await JobStore.update(jobId, {
    status: 'running',
    started_at: new Date(),
    image: env.dockerImage,
    environment: env.slug
  });

  // Execute in Docker sandbox
  const result = await executeInSandbox({
    jobId,
    environment: env,
    code: jobData.code,
    stdin: jobData.stdin,
    files: jobData.files,
    timeLimitSec: jobData.time_limit_sec || env.defaultTimeLimitSec,
    memoryMb: jobData.memory_mb || env.defaultMemoryLimitMb,
    onLog: async (chunk: string) => {
      await JobStore.appendLog(jobId, chunk);
    }
  });

  // Extract structured SQL or custom results if present in artifacts
  let structuredResults: any[] | undefined;
  const sqlArtifact = result.artifacts?.find((a) => a.fileName === 'execution_result.json');
  if (sqlArtifact && sqlArtifact.dataBase64) {
    try {
      const parsed = JSON.parse(Buffer.from(sqlArtifact.dataBase64, 'base64').toString('utf-8'));
      if (parsed && parsed.results) {
        structuredResults = parsed.results;
      }
    } catch {
      // ignore
    }
  }

  // Update job doc with final execution status
  await JobStore.update(jobId, {
    status: result.status,
    completed_at: new Date(),
    execution_time_ms: result.executionTimeMs,
    exit_code: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
    artifacts: result.artifacts,
    output: {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      execution_time_ms: result.executionTimeMs,
      results: structuredResults
    }
  });

  // Publish event to Redis for downstream consumers (e.g. assessment-grader, UI websockets)
  const eventPayload = {
    type: result.status === 'completed' ? 'execution.completed' : 'execution.failed',
    data: {
      jobId,
      submission_id: jobData.submission_id,
      submitter_id: jobData.submitter_id,
      assessment_id: jobData.assessment_id,
      practical_id: jobData.practical_id,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      execution_time_ms: result.executionTimeMs,
      artifacts: result.artifacts,
      results: structuredResults
    }
  };

  await publishEvent('execution.events', eventPayload);

  return result;
}

/**
 * Handle incoming submission event from submission-service
 */
export async function processSubmissionEvent(submission: any) {
  console.log(`[Worker] Received submission event for submission ${submission.id || submission._id}`);
  const req: CodeExecutionRequest = {
    submission_id: submission.id || submission._id,
    submitter_id: submission.submitter_id,
    assessment_id: submission.assessment_id,
    practical_id: submission.practical_id,
    language: submission.language || submission.metadata?.language,
    environment: submission.metadata?.environment,
    code: submission.code || submission.metadata?.code,
    stdin: submission.metadata?.stdin,
    files: submission.metadata?.files,
    time_limit_sec: submission.metadata?.time_limit_sec,
    memory_mb: submission.metadata?.memory_mb
  };

  return executeJob(req);
}

/**
 * Start background worker loop to consume from Redis queue 'job_queue'
 */
export async function startWorkerQueue(redisUrl: string) {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  initRedisPublisher(redisUrl);

  const consumerRedis = new IORedis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: null });
  try {
    await consumerRedis.connect();
    console.log('[Worker] Connected to Redis queue consumer (listening on "job_queue")');
  } catch (err: any) {
    console.warn('[Worker] Redis consumer connection failed:', err.message);
    return;
  }

  // Subscribe to submission.created events
  const subRedis = new IORedis(redisUrl, { lazyConnect: true });
  subRedis.connect().then(() => {
    subRedis.subscribe('submissions.events', (err) => {
      if (err) console.error('[Worker] Subscribe error on submissions.events:', err);
      else console.log('[Worker] Subscribed to submissions.events channel');
    });

    subRedis.on('message', async (_channel, message) => {
      try {
        const ev = JSON.parse(message);
        if (ev && ev.type === 'submission.created' && ev.data) {
          await processSubmissionEvent(ev.data);
        }
      } catch (err) {
        console.error('[Worker] Failed to process submissions.events message:', err);
      }
    });
  }).catch((e) => console.warn('[Worker] Redis sub connection error:', e.message));

  // Loop for queue jobs
  (async () => {
    while (isWorkerRunning) {
      try {
        // BLPOP blocks for up to 5 seconds waiting for a job
        const res = await consumerRedis.blpop('job_queue', 5);
        if (res && res[1]) {
          const jobPayload = JSON.parse(res[1]);
          console.log(`[Worker] Picked job from queue: ${jobPayload.jobId || 'new'}`);
          await executeJob(jobPayload);
        }
      } catch (err: any) {
        if (!isWorkerRunning) break;
        // Avoid tight loop on redis disconnection
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
}

export function stopWorker() {
  isWorkerRunning = false;
  if (redisPublisher) {
    redisPublisher.disconnect();
    redisPublisher = null;
  }
}
