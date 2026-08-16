import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  //okh so pool be like kind of database strucutre or instance that we can use to connect to the database and run queries
  pool = new Pool({ host, port, user, password, database });
  return pool;
}
