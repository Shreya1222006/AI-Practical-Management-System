import { getPool } from '../utils/db';

export async function createPractical(data: any) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO practicals(id, institution_id, subject_id, environment_id, title, description, metadata, max_marks, due_date, language, created_by, created_at, updated_at)
     VALUES(gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
    [data.institution_id, data.subject_id, data.environment_id || null, data.title, data.description || null, data.metadata || {}, data.max_marks || null, data.due_date || null, data.language || null]
  );
  return res.rows[0];
}

export async function listPracticals(limit = 100) {
  const pool = getPool();
  const res = await pool.query('SELECT id,institution_id,subject_id,environment_id,title,description,metadata,max_marks,due_date,language,created_by,created_at,updated_at FROM practicals ORDER BY created_at DESC LIMIT $1', [limit]);
  return res.rows;
}

export async function getPracticalById(id: string) {
  const pool = getPool();
  const res = await pool.query('SELECT id,institution_id,subject_id,environment_id,title,description,metadata,max_marks,due_date,language,created_by,created_at,updated_at FROM practicals WHERE id=$1 LIMIT 1', [id]);
  return res.rows[0];
}

export async function updatePractical(id: string, patch: any) {
  const pool = getPool();
  const fields: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  for (const k of ['title', 'description', 'metadata', 'max_marks', 'due_date', 'language', 'environment_id']) {
    if (patch[k] !== undefined) {
      fields.push(`${k}=$${idx++}`);
      vals.push(patch[k]);
    }
  }
  if (fields.length === 0) return getPracticalById(id);
  vals.push(id);
  const q = `UPDATE practicals SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${idx} RETURNING id,institution_id,subject_id,environment_id,title,description,metadata,max_marks,due_date,language,created_by,created_at,updated_at`;
  const res = await pool.query(q, vals);
  return res.rows[0];
}

//EXPLANATION OF THE ABOVE CODE:
//id(string): The unique identifier of the practical to update.
//patch(object): An object containing the fields to update. Only the fields present in this object will be updated in the database.

//const pool = getPool(): gets a Postgres connection pool used to run queries
//const fields: string[] = []; -array to collect column=$n fragments for SQL SET clause

//const vals: any:[];-array to collect parameter values corresponding to the placeholders
//let idx = 1;- next parameter index for placeholder($1,$2,$3,...).

//3. Build dynamic SET clause:for(const k of ['title','description','metadata','max_marks','due_date','language','environment_id'])
 //iterate only allowed/updatable columns(whitelist)


// *******************Concrete Example:*********************************
// @Call: await updatePractical('p-123', {title:'Lab 1-Arrays', max_marks:50})
// @Execution steps:
//    * Start : fields=[], vals=[], idx=1
//    * For k='title' : present->push title=$1 , vals.push('Lab 1 - Arrays'), now idx = 2.
//    * for k='description': not present -> skip
//    * ...skip others until k='max_marks': present -> push max_marks=$2, Vals.push(50), now idx = 3
//    * After loop: fields=['title=$1','max_marks=$2'], vals = ['Lab 1 - Arrays', 50 ], idx =3
//    * vals.push(id) -> vals = ['Lab 1 -Arrays', 50, 'p-123'].
//    * q becomes:
//    * UPDATE practicals SET title=$1,max_marks=$2, updated_at=NOW() WHERE id=$3 
//    * RETURNING id, institution_id , subject_id, environment_id, title,description,metadata,max_marks,due_date,language,created_by,created_at,updated_at
//    *
//    * the DB calls Pool.query(q, vals) runs with the parameter array above. The updated row(with new title, max_marks, and updated_at) is returned