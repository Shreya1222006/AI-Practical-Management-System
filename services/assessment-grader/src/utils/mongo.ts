import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri: string) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('assessment-grader: connected to mongo');
}

export function getDb() {
  if (!db) throw new Error('mongo not connected');
  return db;
}

export function getJobsCollection() {
  return getDb().collection('execution_jobs');
}
