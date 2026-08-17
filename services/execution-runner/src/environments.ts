import { EnvironmentInfo, ExecutionEnvironmentSlug } from './types';

export const ENVIRONMENTS: Record<string, EnvironmentInfo> = {
  'cpp-gcc': {
    slug: 'cpp-gcc',
    name: 'C/C++ Runner (DSA, OOP, OS)',
    dockerImage: process.env.IMAGE_CPP || 'vpl-cpp-runner:1.0',
    language: 'cpp',
    subjects: ['DSA', 'OOP', 'OS'],
    description: 'GCC/G++ 13 runtime with Make, POSIX threads, and standard C/C++ libraries for systems programming, data structures, and OOP practicals.',
    defaultTimeLimitSec: 30,
    defaultMemoryLimitMb: 512,
    components: {
      runtime: { gcc: '13.x', 'g++': '13.x', make: '4.x', glibc: '2.36+' },
      tools: ['g++', 'gcc', 'make', 'bash', 'coreutils'],
      libraries: ['pthread', 'math', 'stdc++']
    }
  },
  'python-dl': {
    slug: 'python-dl',
    name: 'Python, ML & Deep Learning Stack (DSA, ML, DL, DS)',
    dockerImage: process.env.IMAGE_PYTHON_DL || 'vpl-python-dl:1.0',
    language: 'python',
    subjects: ['DSA', 'ML', 'DL', 'DS'],
    description: 'Unified Python 3.11 stack with PyTorch, Scikit-Learn, Pandas, NumPy, Matplotlib, Seaborn, and Jupyter execution support.',
    defaultTimeLimitSec: 60,
    defaultMemoryLimitMb: 2048,
    components: {
      runtime: { python: '3.11.x' },
      tools: ['python3', 'pip', 'ipython', 'nbconvert'],
      libraries: [
        'torch (PyTorch)',
        'torchvision',
        'scikit-learn',
        'numpy',
        'pandas',
        'matplotlib',
        'seaborn',
        'scipy'
      ]
    }
  },
  'postgres-dbms': {
    slug: 'postgres-dbms',
    name: 'PostgreSQL DBMS Sandbox (DBMS)',
    dockerImage: process.env.IMAGE_POSTGRES || 'vpl-postgres-runner:1.0',
    language: 'sql',
    subjects: ['DBMS'],
    description: 'Isolated PostgreSQL 16 database runner that executes DDL/DML queries and returns structured JSON result grids.',
    defaultTimeLimitSec: 60,
    defaultMemoryLimitMb: 1024,
    components: {
      runtime: { postgresql: '16.x', python: '3.11.x' },
      tools: ['psql', 'initdb', 'pg_ctl', 'sql-runner'],
      libraries: ['psycopg2', 'pg_catalog']
    }
  }
};

/**
 * Resolve environment slug and fallback mappings from language or alias
 */
export function resolveEnvironment(slugOrLang?: string): EnvironmentInfo {
  if (!slugOrLang) {
    return ENVIRONMENTS['python-dl'];
  }

  const normalized = slugOrLang.toLowerCase().trim();

  // Direct match
  if (ENVIRONMENTS[normalized]) {
    return ENVIRONMENTS[normalized];
  }

  // C / C++ aliases
  if (['cpp', 'c++', 'c', 'gcc', 'g++', 'dsa-cpp', 'oop', 'os'].includes(normalized)) {
    return ENVIRONMENTS['cpp-gcc'];
  }

  // SQL / DBMS aliases
  if (['sql', 'psql', 'postgres', 'postgresql', 'dbms', 'db'].includes(normalized)) {
    return ENVIRONMENTS['postgres-dbms'];
  }

  // Python / ML / DL / DS aliases
  if (['python', 'py', 'python-dsa', 'jupyter-ml', 'jupyter-dl', 'jupyter-ds', 'ml', 'dl', 'ds'].includes(normalized)) {
    return ENVIRONMENTS['python-dl'];
  }

  return ENVIRONMENTS['python-dl'];
}
