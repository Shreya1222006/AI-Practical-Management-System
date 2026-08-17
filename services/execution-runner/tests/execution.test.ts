import { resolveEnvironment, ENVIRONMENTS } from '../src/environments';
import { JobStore } from '../src/utils/mongo';

async function runTests() {
  console.log('Testing Environment Resolver...');

  // 1. C++ resolution
  const cppEnv = resolveEnvironment('cpp-gcc');
  console.assert(cppEnv.slug === 'cpp-gcc', 'Expected cpp-gcc slug');
  console.assert(cppEnv.subjects.includes('DSA'), 'Expected DSA subject in cpp-gcc');
  console.assert(cppEnv.subjects.includes('OS'), 'Expected OS subject in cpp-gcc');
  console.assert(cppEnv.subjects.includes('OOP'), 'Expected OOP subject in cpp-gcc');
  console.log(' [PASS] C++ environment resolved properly');

  // 2. Python / Deep Learning resolution
  const dlEnv = resolveEnvironment('python-dl');
  console.assert(dlEnv.slug === 'python-dl', 'Expected python-dl slug');
  console.assert(dlEnv.subjects.includes('ML'), 'Expected ML subject in python-dl');
  console.assert(dlEnv.subjects.includes('DL'), 'Expected DL subject in python-dl');
  console.assert(dlEnv.components.libraries.includes('torch (PyTorch)'), 'Expected PyTorch in libraries');
  console.log(' [PASS] Python/DL environment resolved properly');

  // 3. PostgreSQL resolution
  const dbEnv = resolveEnvironment('postgres-dbms');
  console.assert(dbEnv.slug === 'postgres-dbms', 'Expected postgres-dbms slug');
  console.assert(dbEnv.subjects.includes('DBMS'), 'Expected DBMS subject in postgres-dbms');
  console.log(' [PASS] PostgreSQL/DBMS environment resolved properly');

  // 4. Aliases
  console.assert(resolveEnvironment('cpp').slug === 'cpp-gcc', 'cpp alias failed');
  console.assert(resolveEnvironment('ml').slug === 'python-dl', 'ml alias failed');
  console.assert(resolveEnvironment('sql').slug === 'postgres-dbms', 'sql alias failed');
  console.log(' [PASS] Environment aliases resolved properly');

  // 5. JobStore in-memory fallback
  const testJobId = 'test-job-123';
  await JobStore.insert({
    _id: testJobId,
    language: 'cpp',
    environment: 'cpp-gcc',
    image: 'vpl-cpp-runner:1.0',
    status: 'queued',
    created_at: new Date(),
    updated_at: new Date(),
    logs: []
  });

  let job = await JobStore.get(testJobId);
  console.assert(job !== null && job.status === 'queued', 'JobStore insert failed');

  await JobStore.update(testJobId, { status: 'completed', stdout: 'Hello C++\n' });
  job = await JobStore.get(testJobId);
  console.assert(job !== null && job.status === 'completed' && job.stdout === 'Hello C++\n', 'JobStore update failed');
  console.log(' [PASS] JobStore in-memory operations verified');

  console.log('\nAll unit tests passed successfully!');
}

runTests().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
