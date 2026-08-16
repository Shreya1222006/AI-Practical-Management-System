import Redis from 'ioredis';
import { getConfig } from '../../../../libs/shared/config';

const cfg = getConfig();
let redis: Redis | null = null;
if (process.env.REDIS_URL || cfg.redisUrl) {
  const url = process.env.REDIS_URL || cfg.redisUrl;
  redis = new Redis(url);
}

export async function publishEvent(channel: string, payload: any) {
  try {
    if (!redis) {
      console.log('event', channel, JSON.stringify(payload));
      return;
    }
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error('publishEvent error', err);
  }
}
