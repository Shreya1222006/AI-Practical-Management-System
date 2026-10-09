export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  batch_id?: string | null;
};

export type Question = {
  id: string;
  title: string;
  prompt: string;
  language?: string;
  environment?: string;
  time_limit_sec?: number;
  memory_limit_mb?: number;
  position?: number;
  test_cases?: Array<{
    id: string;
    input: string;
    expected_output?: string;
    points?: string | number;
    is_hidden?: boolean;
    position?: number;
  }>;
};

export type Assessment = {
  id: string;
  title: string;
  subject_id: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  resources?: unknown[] | null;
  questions?: Question[];
  created_at?: string;
};

export type Practical = {
  id: string;
  institution_id: string;
  subject_id: string;
  environment_id?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  max_marks?: number | null;
  due_date?: string | null;
  language?: string | null;
  created_at?: string;
};

export type Submission = {
  id: string;
  submitter_id: string;
  assessment_id?: string | null;
  question_id?: string | null;
  practical_id?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
  grader_results?: Array<Record<string, unknown>>;
  score?: number | string | null;
  graded?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ExecutionResult = {
  jobId?: string;
  job_id?: string;
  status?: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number | null;
  execution_time_ms?: number;
  test_case_results?: Array<{
    test_case_id: string;
    status: string;
    actual_output?: string;
    stderr?: string;
    exit_code?: number | null;
    execution_time_ms?: number;
  }>;
  error?: string;
};
