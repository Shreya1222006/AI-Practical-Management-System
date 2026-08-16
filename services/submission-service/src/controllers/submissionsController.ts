import { Request, Response } from 'express';
import * as repo from '../models/submissionRepo';
import { getConfig } from '../../../../libs/shared/config';
import IORedis from 'ioredis';

// Load typed runtime configuration shared across services
const config = getConfig();

// Simple in-memory rate limiter fallback used when Redis isn't configured.
// Keys are client IPs and values track request count + reset timestamp.
const rateMap = new Map<string, { count: number; reset: number }>();

async function allowRequest(ip: string): Promise<boolean> {
  // Prefer Redis-backed counter when available for multi-instance safety.
  if (config.redisUrl) {
    const redis = new IORedis(config.redisUrl);
    const key = `rl:${ip}`; // Redis key namespace for rate limits
    const v = await redis.incr(key); // increment request counter
    if (v === 1) await redis.expire(key, 60); // first hit sets TTL to 60s
    const allowed = v <= 10; // allow up to 10 requests per minute
    redis.disconnect();
    return allowed;
  }

  // Fallback to local in-memory limiter for single-instance/dev usage
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    // reset window
    entry.count = 1;
    entry.reset = now + 60_000;
  } else {
    // increment within window
    entry.count += 1;
  }
  rateMap.set(ip, entry);
  return entry.count <= 10;
}

export async function createSubmission(req: Request, res: Response) {
  // Identify client IP for rate-limiting and abuse protection
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  if (!(await allowRequest(ip))) return res.status(429).json({ error: 'rate limit exceeded' });

  // Destructure expected submission payload fields
  const { submitter_id, assessment_id, practical_id, metadata, attachments } = req.body;
  if (!submitter_id) return res.status(400).json({ error: 'submitter_id required' });

  try {
    // Anti-spam: if this is for an assessment, check the most recent submission
    // by the same submitter for the same assessment. If a very recent (10s)
    // submission exists with identical metadata, reject it as a likely duplicate.
    if (assessment_id) {
      const last = await repo.findLatestBySubmitterAssessment(submitter_id, assessment_id);
      if (last && last.created_at) {
        const diff = Date.now() - new Date(last.created_at).getTime();
        if (diff < 10_000 && JSON.stringify(last.metadata) === JSON.stringify(metadata)) {
          return res.status(429).json({ error: 'too many similar submissions' });
        }
      }
    }

    // Anti-spam: same check for practical submissions (symmetric behavior)
    if (practical_id) {
      const lastP = await repo.findLatestBySubmitterPractical(submitter_id, practical_id);
      if (lastP && lastP.created_at) {
        const diffP = Date.now() - new Date(lastP.created_at).getTime();
        if (diffP < 10_000 && JSON.stringify(lastP.metadata) === JSON.stringify(metadata)) {
          return res.status(429).json({ error: 'too many similar submissions' });
        }
      }
    }

    // Persist the submission record
    const created = await repo.create({ submitter_id, assessment_id, practical_id, metadata, attachments });

    // Publish an event so other services (execution runner, grader) can react.
    // Uses Redis pub/sub when configured, otherwise falls back to a console log
    if (config.redisUrl) {
      const redis = new IORedis(config.redisUrl);
      await redis.publish('submissions.events', JSON.stringify({ type: 'submission.created', data: created }));
      redis.disconnect();
    } else {
      console.log('submission.created', created.id);
    }

    // Return the created submission to the client
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function listSubmissions(req: Request, res: Response) {
  try {
    const submitter_id = req.query.submitter_id as string | undefined;
    const list = submitter_id ? await repo.findBySubmitter(submitter_id) : await repo.listRecent();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function getSubmission(req: Request, res: Response) {
  const id = String(req.params.id);
  try {
    const item = await repo.findById(id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}
