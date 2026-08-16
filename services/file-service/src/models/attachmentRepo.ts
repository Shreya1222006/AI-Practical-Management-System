import { getPool } from '../utils/db';

/**
 * Insert a new attachment record linked to an activity.
 * @param data - metadata for the attachment (activity_type, activity_id, file_key, optional file_name, size, content type, uploaded_by)
 * @returns the inserted attachment row (including generated id and created_at)
 */
export async function insertAttachment(data: { activity_type: string; activity_id: string; file_key: string; file_name?: string; file_size?: number | null; content_type?: string; uploaded_by?: string | null; }) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO activity_attachments(id, activity_type, activity_id, file_key, file_name, file_size, content_type, uploaded_by, created_at) VALUES(gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id, activity_type, activity_id, file_key, file_name, file_size, content_type, uploaded_by, created_at`,
    [data.activity_type, data.activity_id, data.file_key, data.file_name || null, data.file_size, data.content_type || null, data.uploaded_by || null]
  );
  return res.rows[0];
}

/**
 * Fetch an attachment by its id.
 * @param id - attachment id
 * @returns the attachment row or undefined if not found
 */
export async function findAttachmentById(id: string) {
  const pool = getPool();
  const res = await pool.query(`SELECT id, activity_type, activity_id, file_key, file_name, file_size, content_type, uploaded_by, created_at FROM activity_attachments WHERE id=$1 LIMIT 1`, [id]);
  return res.rows[0];
}

/**
 * Remove an attachment record by id.
 * @param id - attachment id to delete
 */
export async function removeAttachment(id: string) {
  const pool = getPool();
  await pool.query(`DELETE FROM activity_attachments WHERE id=$1`, [id]);
}
