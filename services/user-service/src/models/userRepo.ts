import { getPool } from '../utils/db';

export async function findUserById(id: string) {
  const pool = getPool();
  const res = await pool.query('SELECT id,email,name,role,created_at FROM users WHERE id=$1 LIMIT 1', [id]);
  return res.rows[0];
}

export async function findAllUsers() {
  const pool = getPool();
  const res = await pool.query('SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC LIMIT 100');
  return res.rows;
}

//purpose : Updates a user row in the database with only the fields provided in patch ,returning the updated row. patch contains fields to change.
export async function updateUserById(id: string, patch: any) {
  const pool = getPool();
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const k of ['name', 'role']) {
    if (patch[k] !== undefined) {
      fields.push(`${k}=$${idx++}`);
      values.push(patch[k]);
    }
  }
  if (fields.length === 0) return findUserById(id);
  values.push(id);
  const q = `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id,email,name,role,created_at`;
  const res = await pool.query(q, values);
  return res.rows[0];
}
