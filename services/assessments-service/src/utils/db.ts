import { Pool } from 'pg';
import { getConfig } from '../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb(config?: any) {
  const cfg = config || getConfig();
  pool = new Pool({
    host: cfg.POSTGRES_HOST || process.env.POSTGRES_HOST,
    port: Number(cfg.POSTGRES_PORT || process.env.POSTGRES_PORT || 5432),
    database: cfg.POSTGRES_DB || process.env.POSTGRES_DB,
    user: cfg.POSTGRES_USER || process.env.POSTGRES_USER,
    password: cfg.POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD,
  });
  // simple connectivity check
  await pool.query('SELECT 1');
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}
