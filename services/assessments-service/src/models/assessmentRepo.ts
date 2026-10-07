import { getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export type Assessment = {
  id: string;
  title: string;
  subject_id: string;
  description?: string;
  metadata?: any;
  test_cases?: any;
  resources?: any[];
  question_ids?: string[];
  questions?: AssessmentQuestion[];
  created_at?: string;
  updated_at?: string;
};

export type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  position: number;
  title: string;
  prompt: string;
  language: string;
  environment: string;
  time_limit_sec: number;
  memory_limit_mb: number;
  test_cases: AssessmentTestCase[];
};

export type QuestionInput = {
  title: string;
  prompt: string;
  language?: string;
  environment?: string;
  time_limit_sec?: number;
  memory_limit_mb?: number;
  test_cases: TestCaseInput[];
};

export type TestCaseInput = {
  input?: string;
  expected_output: string;
  points?: number;
  is_hidden?: boolean;
};

export type AssessmentTestCase = {
  id: string;
  question_id: string;
  position: number;
  input: string;
  expected_output: string;
  points: number;
  is_hidden: boolean;
};

export async function create(a: Partial<Assessment> & { question_ids: string[] }): Promise<Assessment> {
  const pool = getPool();
  const id = a.id || uuidv4();
  const now = new Date().toISOString();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO assessments (id, title, subject_id, description, metadata, resources, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [id, a.title, a.subject_id, a.description || null, a.metadata || null, a.resources || null, now]
    );
    const assessment = result.rows[0];
    const availableQuestions = await client.query(
      'SELECT id FROM questions WHERE id = ANY($1::uuid[])', [a.question_ids]
    );
    if (availableQuestions.rowCount !== a.question_ids.length) {
      throw new Error('QUESTION_IDS_NOT_FOUND');
    }

    for (const [questionIndex, questionId] of a.question_ids.entries()) {
      await client.query(
        `INSERT INTO assessment_questions (assessment_id, question_id, position)
         VALUES ($1,$2,$3)`,
        [id, questionId, questionIndex]
      );
    }

    const createdQuestions = [];
    for (const [position, questionId] of a.question_ids.entries()) {
      const question = await client.query('SELECT * FROM questions WHERE id=$1', [questionId]);
      const cases = await client.query(
        'SELECT * FROM question_test_cases WHERE question_id=$1 ORDER BY position', [questionId]
      );
      createdQuestions.push({ ...question.rows[0], assessment_id: id, position, test_cases: cases.rows });
    }

    await client.query('COMMIT');
    return { ...assessment, questions: createdQuestions };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createQuestion(input: QuestionInput) {
  const pool = getPool();
  const client = await pool.connect();
  const questionId = uuidv4();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO questions
        (id, title, prompt, language, environment, time_limit_sec, memory_limit_mb)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [questionId, input.title, input.prompt, input.language || 'cpp', input.environment || 'cpp-gcc',
        input.time_limit_sec || 5, input.memory_limit_mb || 256]
    );
    const testCases: AssessmentTestCase[] = [];
    for (const [position, testCase] of input.test_cases.entries()) {
      const createdTestCase: AssessmentTestCase = {
        id: uuidv4(),
        question_id: questionId,
        position,
        input: testCase.input ?? '',
        expected_output: testCase.expected_output,
        points: testCase.points ?? 1,
        is_hidden: testCase.is_hidden ?? true
      };
      await client.query(
        `INSERT INTO question_test_cases
          (id, question_id, position, input, expected_output, points, is_hidden)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [createdTestCase.id, questionId, position, createdTestCase.input, createdTestCase.expected_output,
          createdTestCase.points, createdTestCase.is_hidden]
      );
      testCases.push(createdTestCase);
    }
    await client.query('COMMIT');
    return { ...result.rows[0], test_cases: testCases };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findById(id: string): Promise<Assessment | null> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE id=$1', [id]);
  if (!r.rows[0]) return null;
  const assessment = r.rows[0];
  const questions = await pool.query(
    `SELECT q.*, aq.assessment_id, aq.position
     FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id
     WHERE aq.assessment_id=$1 ORDER BY aq.position`, [id]
  );
  const hydratedQuestions = await Promise.all(questions.rows.map(async (question) => {
    const cases = await pool.query(
      `SELECT id, position, input, expected_output, points, is_hidden
       FROM question_test_cases WHERE question_id=$1 AND is_hidden=FALSE ORDER BY position`, [question.id]
    );
    return { ...question, test_cases: cases.rows };
  }));
  return { ...assessment, questions: hydratedQuestions };
}

async function findQuestion(assessmentId: string, questionId: string) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT q.*, aq.assessment_id, aq.position
     FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id
     WHERE q.id=$1 AND aq.assessment_id=$2`,
    [questionId, assessmentId]
  );
  return result.rows[0] || null;
}

export async function listExecutionCases(assessmentId: string, questionId: string) {
  const pool = getPool();
  const question = await findQuestion(assessmentId, questionId);
  if (!question) return null;
  const cases = await pool.query(
    'SELECT id, input, position FROM question_test_cases WHERE question_id=$1 ORDER BY position',
    [questionId]
  );
  return { ...question, test_cases: cases.rows };
}

export async function findAssessmentQuestion(assessmentId: string, questionId: string) {
  return findQuestion(assessmentId, questionId);
}

export async function listGradingCases(assessmentId: string, questionId: string) {
  const pool = getPool();
  if (!await findQuestion(assessmentId, questionId)) return null;
  const cases = await pool.query(
    'SELECT id, expected_output, points, is_hidden, position FROM question_test_cases WHERE question_id=$1 ORDER BY position',
    [questionId]
  );
  return cases.rows;
}

export async function findBySubject(subject_id: string): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE subject_id=$1 ORDER BY created_at DESC', [subject_id]);
  return r.rows;
}

export async function listAll(): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments ORDER BY created_at DESC LIMIT 100');
  return r.rows;
}
