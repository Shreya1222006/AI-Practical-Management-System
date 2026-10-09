import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb(config?: any) {
  getConfig();
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_DATABASE_URL is required');
  }

  pool = new Pool({ connectionString });
  await pool.query('SELECT 1');
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}
