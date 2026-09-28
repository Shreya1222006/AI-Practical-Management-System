import { getPool } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export type Assessment = {
  id: string;
  title: string;
  course_id: string;
  description?: string;
  metadata?: any;
  test_cases?: any;
  resources?: any[];
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

export type AssessmentTestCase = {
  id: string;
  question_id: string;
  position: number;
  input: string;
  expected_output: string;
  points: number;
  is_hidden: boolean;
};

export async function create(a: Partial<Assessment>): Promise<Assessment> {
  const pool = getPool();
  const id = a.id || uuidv4();
  const now = new Date().toISOString();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO assessments (id, title, course_id, description, metadata, resources, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [id, a.title, a.course_id, a.description || null, a.metadata || null, a.resources || null, now]
    );
    const assessment = result.rows[0];
    const createdQuestions: AssessmentQuestion[] = [];

    for (const [questionIndex, question] of (a.questions || []).entries()) {
      const questionId = uuidv4();
      const createdQuestion: AssessmentQuestion = {
        id: questionId,
        assessment_id: id,
        position: questionIndex,
        title: question.title,
        prompt: question.prompt,
        language: question.language || 'cpp',
        environment: question.environment || 'cpp-gcc',
        time_limit_sec: question.time_limit_sec || 5,
        memory_limit_mb: question.memory_limit_mb || 256,
        test_cases: []
      };
      await client.query(
        `INSERT INTO assessment_questions
          (id, assessment_id, position, title, prompt, language, environment, time_limit_sec, memory_limit_mb)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [questionId, id, questionIndex, createdQuestion.title, createdQuestion.prompt, createdQuestion.language,
          createdQuestion.environment, createdQuestion.time_limit_sec, createdQuestion.memory_limit_mb]
      );

      for (const [caseIndex, testCase] of (question.test_cases || []).entries()) {
        const testCaseId = uuidv4();
        const createdTestCase: AssessmentTestCase = {
          id: testCaseId,
          question_id: questionId,
          position: caseIndex,
          input: testCase.input ?? '',
          expected_output: testCase.expected_output,
          points: testCase.points ?? 1,
          is_hidden: testCase.is_hidden ?? true
        };
        await client.query(
          `INSERT INTO question_test_cases
            (id, question_id, position, input, expected_output, points, is_hidden)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [testCaseId, questionId, caseIndex, createdTestCase.input, createdTestCase.expected_output,
            createdTestCase.points, createdTestCase.is_hidden]
        );
        createdQuestion.test_cases.push(createdTestCase);
      }
      createdQuestions.push(createdQuestion);
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

export async function findById(id: string): Promise<Assessment | null> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE id=$1', [id]);
  if (!r.rows[0]) return null;
  const assessment = r.rows[0];
  const questions = await pool.query(
    'SELECT * FROM assessment_questions WHERE assessment_id=$1 ORDER BY position', [id]
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
    'SELECT * FROM assessment_questions WHERE id=$1 AND assessment_id=$2',
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

export async function findByCourse(course_id: string): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments WHERE course_id=$1 ORDER BY created_at DESC', [course_id]);
  return r.rows;
}

export async function listAll(): Promise<Assessment[]> {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM assessments ORDER BY created_at DESC LIMIT 100');
  return r.rows;
}
