import { MongoClient, Db, Collection } from 'mongodb';
import { ExecutionJobDoc } from '../types';

let client: MongoClient | null = null;
let db: Db | null = null;

// In-memory fallback map if MongoDB is temporarily unavailable or during standalone dev
const inMemoryJobs = new Map<string, ExecutionJobDoc>();

export async function connectMongo(uri: string) {
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db();
    console.log('[MongoDB] Connected successfully');
  } catch (err: any) {
    console.warn(`[MongoDB] Connection failed (${err.message}). Using in-memory job store fallback.`);
    db = null;
  }
}

export function isMongoConnected(): boolean {
  return db !== null;
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected');
  return db;
}

export function getJobsCollection(): Collection<ExecutionJobDoc> {
  return getDb().collection<ExecutionJobDoc>('execution_jobs');
}

/**
 * Job persistence helper that works seamlessly with both MongoDB and the in-memory fallback
 */
export const JobStore = {
  async insert(job: ExecutionJobDoc): Promise<void> {
    inMemoryJobs.set(job._id, job);
    if (db) {
      try {
        await getJobsCollection().insertOne(job as any);
      } catch (e) {
        console.error('[JobStore] Mongo insert error:', e);
      }
    }
  },

  async update(jobId: string, update: Partial<ExecutionJobDoc>): Promise<void> {
    const existing = inMemoryJobs.get(jobId);
    if (existing) {
      Object.assign(existing, update, { updated_at: new Date() });
    }

    if (db) {
      try {
        await getJobsCollection().updateOne(
          { _id: jobId } as any,
          { $set: { ...update, updated_at: new Date() } }
        );
      } catch (e) {
        console.error('[JobStore] Mongo update error:', e);
      }
    }
  },

  async appendLog(jobId: string, line: string): Promise<void> {
    const existing = inMemoryJobs.get(jobId);
    if (existing) {
      existing.logs.push({ ts: new Date(), line });
    }

    if (db) {
      try {
        await getJobsCollection().updateOne(
          { _id: jobId } as any,
          { $push: { logs: { ts: new Date(), line } } as any, $set: { updated_at: new Date() } }
        );
      } catch (e) {
        // silent
      }
    }
  },

  async get(jobId: string): Promise<ExecutionJobDoc | null> {
    if (db) {
      try {
        const found = await getJobsCollection().findOne({ _id: jobId } as any);
        if (found) return found as unknown as ExecutionJobDoc;
      } catch (e) {
        // fallback to memory
      }
    }
    return inMemoryJobs.get(jobId) || null;
  }
};
