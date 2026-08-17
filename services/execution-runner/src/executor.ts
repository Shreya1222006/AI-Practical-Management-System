import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { EnvironmentInfo, ExecutionArtifact, ExecutionResult, JobStatus } from './types';

export interface ExecuteOptions {
  jobId: string;
  environment: EnvironmentInfo;
  code?: string;
  stdin?: string;
  files?: Array<{ name: string; content: string }>;
  timeLimitSec?: number;
  memoryMb?: number;
  workspaceBaseDir?: string;
  onLog?: (chunk: string) => Promise<void> | void;
}

/**
 * Format local host path for Docker volume mounting across OS platforms
 */
function getDockerMountPath(localPath: string): string {
  const resolved = path.resolve(localPath);
  // If running on Windows, Docker Desktop handles 'c:\path' or '/c/path'
  if (process.platform === 'win32') {
    return resolved.replace(/\\/g, '/');
  }
  return resolved;
}

/**
 * Collect generated artifact files (plots, saved models, structured json) from workspace
 */
function collectArtifacts(workspaceDir: string): ExecutionArtifact[] {
  const artifacts: ExecutionArtifact[] = [];
  try {
    const files = fs.readdirSync(workspaceDir);
    for (const file of files) {
      const fullPath = path.join(workspaceDir, file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      // Skip source files, input, and binaries
      if (['.cpp', '.c', '.h', '.hpp', '.py', '.txt', '.o', '.bin', '.exe'].includes(ext)) {
        continue;
      }

      let contentType = 'application/octet-stream';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.csv') contentType = 'text/csv';
      else if (ext === '.ipynb') contentType = 'application/x-ipynb+json';

      // Read small files (like images, json) into base64 for direct UI embedding
      let dataBase64: string | undefined;
      if (stat.size <= 5 * 1024 * 1024) {
        dataBase64 = fs.readFileSync(fullPath).toString('base64');
      }

      artifacts.push({
        fileName: file,
        filePath: fullPath,
        sizeBytes: stat.size,
        contentType,
        dataBase64
      });
    }
  } catch (err) {
    console.warn(`Error scanning artifacts in ${workspaceDir}:`, err);
  }
  return artifacts;
}

/**
 * Execute code inside isolated Docker sandbox container
 */
export async function executeInSandbox(opts: ExecuteOptions): Promise<ExecutionResult> {
  const {
    jobId,
    environment,
    code = '',
    stdin = '',
    files = [],
    timeLimitSec = environment.defaultTimeLimitSec,
    memoryMb = environment.defaultMemoryLimitMb,
    workspaceBaseDir = path.resolve(process.cwd(), 'jobs'),
    onLog
  } = opts;

  const workspaceDir = path.join(workspaceBaseDir, jobId);
  fs.mkdirSync(workspaceDir, { recursive: true });

  // 1. Write source files into workspace based on environment
  if (files && files.length > 0) {
    for (const f of files) {
      const targetPath = path.join(workspaceDir, f.name);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, f.content, 'utf-8');
    }
  }

  // If direct code was provided, create appropriate entrypoint file
  if (code.trim()) {
    let defaultFileName = 'main.py';
    if (environment.slug === 'cpp-gcc') {
      defaultFileName = 'main.cpp';
    } else if (environment.slug === 'postgres-dbms') {
      defaultFileName = 'query.sql';
    } else if (environment.slug === 'python-dl') {
      // If DL keywords present or practical requires training script
      defaultFileName = code.includes('torch') || code.includes('train') ? 'train.py' : 'main.py';
    }

    const mainFilePath = path.join(workspaceDir, defaultFileName);
    if (!fs.existsSync(mainFilePath)) {
      fs.writeFileSync(mainFilePath, code, 'utf-8');
    }
  }

  // Write stdin if supplied
  if (stdin.trim()) {
    fs.writeFileSync(path.join(workspaceDir, 'input.txt'), stdin, 'utf-8');
  }

  // 2. Prepare Docker command args
  const containerName = `vpl-exec-${jobId}`;
  const dockerMount = getDockerMountPath(workspaceDir);
  const cpuLimit = environment.slug === 'python-dl' ? '2.0' : '1.0';

  const dockerArgs = [
    'run',
    '--rm',
    '--name', containerName,
    '--network', 'none',
    `--memory=${memoryMb}m`,
    `--cpus=${cpuLimit}`,
    '-v', `${dockerMount}:/workspace`,
    environment.dockerImage
  ];

  const logHelper = async (msg: string) => {
    if (onLog) {
      try {
        await onLog(msg);
      } catch {
        // ignore log streaming errors
      }
    }
  };

  await logHelper(`[Runner] Initializing sandbox for environment: ${environment.name} (${environment.dockerImage})\n`);
  await logHelper(`[Runner] Container: ${containerName} | Memory: ${memoryMb}MB | Timeout: ${timeLimitSec}s\n\n`);

  let stdoutAccum = '';
  let stderrAccum = '';
  let isTimedOut = false;
  const startTime = Date.now();

  return new Promise<ExecutionResult>((resolve) => {
    let childProc: any = null;
    let timeoutTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };

    try {
      childProc = spawn('docker', dockerArgs);
    } catch (spawnError: any) {
      cleanup();
      const executionTimeMs = Date.now() - startTime;
      return resolve({
        jobId,
        status: 'failed',
        stdout: '',
        stderr: `Failed to spawn docker process: ${spawnError.message || spawnError}`,
        exitCode: -1,
        executionTimeMs,
        error: spawnError.message
      });
    }

    // Timeout watchdog
    timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      const timeoutMsg = `\n[Runner Error] Execution timed out after ${timeLimitSec} seconds.\n`;
      stderrAccum += timeoutMsg;
      logHelper(timeoutMsg);

      // Force-kill docker container
      exec(`docker kill ${containerName}`, () => {
        if (childProc && !childProc.killed) {
          childProc.kill('SIGKILL');
        }
      });
    }, (timeLimitSec * 1000) + 1500);

    childProc.stdout.on('data', async (chunk: Buffer) => {
      const str = chunk.toString();
      stdoutAccum += str;
      await logHelper(str);
    });

    childProc.stderr.on('data', async (chunk: Buffer) => {
      const str = chunk.toString();
      stderrAccum += str;
      await logHelper(str);
    });

    childProc.on('error', async (err: Error) => {
      cleanup();
      const executionTimeMs = Date.now() - startTime;
      const errMsg = `Docker execution error: ${err.message}`;
      stderrAccum += `\n${errMsg}\n`;
      await logHelper(`\n[Runner Error] ${errMsg}\n`);

      resolve({
        jobId,
        status: 'failed',
        stdout: stdoutAccum,
        stderr: stderrAccum,
        exitCode: -1,
        executionTimeMs,
        error: err.message
      });
    });

    childProc.on('close', async (exitCode: number | null) => {
      cleanup();
      const executionTimeMs = Date.now() - startTime;

      let status: JobStatus = 'completed';
      if (isTimedOut) {
        status = 'time_limit_exceeded';
      } else if (exitCode !== 0) {
        status = 'failed';
      }

      await logHelper(`\n[Runner] Process finished with exit code ${exitCode} in ${executionTimeMs}ms\n`);

      // Collect any generated plots, files, or SQL result JSON
      const artifacts = collectArtifacts(workspaceDir);

      resolve({
        jobId,
        status,
        stdout: stdoutAccum,
        stderr: stderrAccum,
        exitCode,
        executionTimeMs,
        artifacts
      });
    });
  });
}
