import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  pool = new Pool({ host, port, user, password, database });
  return pool;
}
