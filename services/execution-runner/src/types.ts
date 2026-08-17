export type ExecutionEnvironmentSlug =
  | 'cpp-gcc'
  | 'python-dl'
  | 'postgres-dbms'
  // Backward compatibility / alias slugs:
  | 'cpp'
  | 'c++'
  | 'python'
  | 'python-dsa'
  | 'jupyter-ml'
  | 'jupyter-dl'
  | 'jupyter-ds'
  | 'sql';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'time_limit_exceeded';

export interface EnvironmentInfo {
  slug: string;
  name: string;
  dockerImage: string;
  language: string;
  subjects: string[];
  description: string;
  defaultTimeLimitSec: number;
  defaultMemoryLimitMb: number;
  components: {
    runtime: Record<string, string>;
    tools: string[];
    libraries: string[];
  };
}

export interface CodeExecutionRequest {
  language?: string;
  environment?: string;
  code?: string;
  stdin?: string;
  files?: Array<{ name: string; content: string }>;
  time_limit_sec?: number;
  memory_mb?: number;
  submitter_id?: string;
  practical_id?: string;
  assessment_id?: string;
  submission_id?: string;
  sync?: boolean;
}

export interface ExecutionArtifact {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  contentType: string;
  dataBase64?: string;
}

export interface ExecutionResult {
  jobId: string;
  status: JobStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  artifacts?: ExecutionArtifact[];
  error?: string;
}

export interface ExecutionJobDoc {
  _id: string;
  submission_id?: string | null;
  submitter_id?: string | null;
  assessment_id?: string | null;
  practical_id?: string | null;
  language: string;
  environment: string;
  image: string;
  code?: string;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  execution_time_ms?: number;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string;
  output?: {
    stdout: string;
    stderr: string;
    exit_code: number | null;
    execution_time_ms?: number;
    results?: any[];
  };
  logs: Array<{ ts: Date; line: string }>;
  artifacts?: ExecutionArtifact[];
}
