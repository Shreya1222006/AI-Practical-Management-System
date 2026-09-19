import { Pool } from 'pg';
import { getConfig } from '../../../../libs/shared/config';

let pool: Pool | null = null;

export async function initDb() {
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
  pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({ host, port, user, password, database });
  await pool.query('SELECT 1');
  return pool;
}

export function getPool() {
  if (pool) return pool;
  const cfg = getConfig();
  const { host, port, user, password, database } = cfg.postgres;
  //okh so pool be like kind of database strucutre or instance that we can use to connect to the database and run queries
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
  pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({ host, port, user, password, database });
  return pool;
}
