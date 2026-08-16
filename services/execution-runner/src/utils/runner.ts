import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function runInContainer(opts: any, onLog: (chunk: string) => Promise<void>) {
  const { jobId, workspaceDir, image, runCommand, timeLimitSec, memoryMb } = opts;
  // prepare workspace
  fs.mkdirSync(workspaceDir, { recursive: true });

  // Build docker run args
  const containerName = `exec-${jobId}`;
  const memArg = `--memory=${memoryMb}m`;
  const cpusArg = `--cpus=1`;
  const args = [
    'run', '--rm', '--name', containerName, '--network', 'none', memArg, cpusArg,
    '-v', `${workspaceDir}:/workspace`, image,
    'sh', '-c', `cd /workspace && timeout ${timeLimitSec}s ${runCommand}`
  ];

  await onLog(`starting docker ${image} for job ${jobId}\n`);

  return new Promise<void>((resolve, reject) => {
    const cmd = spawn('docker', args);
    cmd.stdout.on('data', async (d) => { await onLog(d.toString()); });
    cmd.stderr.on('data', async (d) => { await onLog(d.toString()); });
    cmd.on('error', (err) => reject(err));
    cmd.on('close', (code) => {
      onLog(`container exited with code ${code}\n`).then(() => {
        if (code === 0) resolve(); else reject(new Error(`exit ${code}`));
      });
    });
  });
}
