import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import IORedis from 'ioredis';
import { resolveEnvironment, ENVIRONMENTS } from './environments';
import { executeJob } from './worker';
import { JobStore, isMongoConnected } from './utils/mongo';
import { CodeExecutionRequest, ExecutionJobDoc } from './types';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let queueRedis: IORedis | null = null;

try {
  queueRedis = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  queueRedis.connect().catch(() => {
    // handled gracefully
  });
} catch {
  queueRedis = null;
}

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'execution-runner',
    mongo: isMongoConnected() ? 'connected' : 'in-memory-fallback',
    redis: queueRedis && queueRedis.status === 'ready' ? 'connected' : 'disconnected',
    environments: Object.keys(ENVIRONMENTS)
  });
});

/**
 * List available execution environments and their components
 */
app.get('/environments', (_req: Request, res: Response) => {
  res.json({
    count: Object.keys(ENVIRONMENTS).length,
    environments: Object.values(ENVIRONMENTS)
  });
});

/**
 * Execute code endpoint (asynchronous by default, supports ?sync=true)
 */
async function handleExecute(req: Request, res: Response) {
  const body = req.body as CodeExecutionRequest;

  if (!body.code && (!body.files || body.files.length === 0)) {
    return res.status(400).json({ error: 'Either "code" or "files" must be provided' });
  }

  const jobId = uuidv4();
  const env = resolveEnvironment(body.environment || body.language);

  // Initialize job document
  const jobDoc: ExecutionJobDoc = {
    _id: jobId,
    submission_id: body.submission_id || null,
    submitter_id: body.submitter_id || null,
    assessment_id: body.assessment_id || null,
    practical_id: body.practical_id || null,
    language: env.language,
    environment: env.slug,
    image: env.dockerImage,
    code: body.code || '',
    status: 'queued',
    created_at: new Date(),
    updated_at: new Date(),
    logs: [],
    artifacts: []
  };

  await JobStore.insert(jobDoc);

  const payload = {
    ...body,
    jobId,
    environment: env.slug,
    language: env.language
  };

  // Synchronous execution mode if requested
  if (req.query.sync === 'true' || body.sync === true) {
    try {
      const result = await executeJob(payload);
      return res.status(200).json({
        jobId,
        status: result.status,
        environment: env.slug,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exitCode,
        execution_time_ms: result.executionTimeMs,
        artifacts: result.artifacts,
        error: result.error
      });
    } catch (err: any) {
      return res.status(500).json({
        jobId,
        status: 'failed',
        error: err.message || 'Execution error'
      });
    }
  }

  // Asynchronous queue mode
  let enqueued = false;
  if (queueRedis && queueRedis.status === 'ready') {
    try {
      await queueRedis.rpush('job_queue', JSON.stringify(payload));
      enqueued = true;
    } catch (err) {
      console.warn('[Queue] Failed to push to Redis queue, executing locally in background:', err);
    }
  }

  // If Redis queue not active, run in background
  if (!enqueued) {
    executeJob(payload).catch((err) => {
      console.error(`[Worker] Background execution error for job ${jobId}:`, err);
    });
  }

  return res.status(202).json({
    job_id: jobId,
    jobId,
    status: 'queued',
    environment: env.slug,
    image: env.dockerImage,
    message: enqueued ? 'Job queued in Redis job_queue' : 'Job executing in background'
  });
}

app.post('/execute', handleExecute);
app.post('/run', handleExecute);

/**
 * Get job status and output
 */
async function handleGetJob(req: Request, res: Response) {
  const jobId = String(req.params.jobId);
  const job = await JobStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found', jobId });
  }

  res.json({
    job_id: job._id,
    jobId: job._id,
    status: job.status,
    environment: job.environment,
    image: job.image,
    language: job.language,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    execution_time_ms: job.execution_time_ms,
    output: {
      stdout: job.stdout || '',
      stderr: job.stderr || '',
      exit_code: job.exit_code ?? null,
      execution_time_ms: job.execution_time_ms ?? 0,
      results: job.output?.results
    },
    stdout: job.stdout || '',
    stderr: job.stderr || '',
    exit_code: job.exit_code ?? null,
    artifacts: job.artifacts || [],
    logs: job.logs || [],
    error: job.error
  });
}

app.get('/jobs/:jobId', handleGetJob);
app.get('/status/:jobId', handleGetJob);

export default app;
