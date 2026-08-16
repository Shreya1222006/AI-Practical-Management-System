import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb() {
  const cfg = getConfig();
  pool = new Pool({
    host: cfg.postgres.host || process.env.POSTGRES_HOST,
    port: Number(cfg.postgres.port || process.env.POSTGRES_PORT || 5432),
    database: cfg.postgres.database || process.env.POSTGRES_DB,
    user: cfg.postgres.user || process.env.POSTGRES_USER,
    password: cfg.postgres.password || process.env.POSTGRES_PASSWORD,
  });
  await pool.query('SELECT 1');
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}
