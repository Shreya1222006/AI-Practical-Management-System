import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb() {
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  pool = new Pool({ host, port, user, password, database });
  await pool.query('SELECT 1');
  return pool;
}

export function getPool() {
  if (pool) return pool;
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  pool = new Pool({ host, port, user, password, database });
  return pool;
}
