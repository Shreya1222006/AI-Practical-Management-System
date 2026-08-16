import { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';
import { getConfig } from '../../libs/shared/config';

const config = getConfig();
const REDIS_URL = process.env.REDIS_URL || (config as any).REDIS_URL;

const map = new Map<string, { count: number; reset: number }>();

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  if (REDIS_URL) {
    const r = new IORedis(REDIS_URL);
    try {
      const key = `rl:${ip}`;
      const v = await r.incr(key);
      if (v === 1) await r.expire(key, 60);
      if (v > 100) return res.status(429).json({ error: 'rate limit' });
    } finally { r.disconnect(); }
    return next();
  }
  const now = Date.now();
  const entry = map.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    entry.count = 1; entry.reset = now + 60_000;
  } else { entry.count += 1; }
  map.set(ip, entry);
  if (entry.count > 100) return res.status(429).json({ error: 'rate limit' });
  return next();
}

export { rateLimiter as default };
