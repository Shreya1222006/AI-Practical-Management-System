import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb(config?: any) {
  const cfg = config || getConfig();
  const postgres = cfg.postgres || cfg;
  const database = postgres.database || postgres.POSTGRES_DB || process.env.POSTGRES_DB || 'practical_db';
  pool = new Pool({
    host: postgres.host || postgres.POSTGRES_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: Number(postgres.port || postgres.POSTGRES_PORT || process.env.POSTGRES_PORT || 5432),
    database,
    user: postgres.user || postgres.POSTGRES_USER || process.env.POSTGRES_USER || 'postgres',
    password: postgres.password || postgres.POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  });
  await pool.query('SELECT 1');
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}
