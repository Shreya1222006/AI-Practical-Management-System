import dotenv from 'dotenv';

export type AppConfig = {
  FILE_SERVICE_URL: string | undefined;
  nodeEnv: string;
  port: number;
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  mongoUri: string;
  redisUrl: string;
  submissionServiceUrl?: string;
  assessmentsServiceUrl?: string;
  s3: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region?: string;
    forcePathStyle?: boolean;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
};

// Load local .env placed next to this file (optional)
// import path from 'path';
// import dotenv from 'dotenv';
// try {
//   const envPath = path.join(__dirname, '.env');
//   / <reference types="node" />
//   dotenv.config({ path: envPath });
// } catch (e) {
//   // ignore
// }

export function getConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 0),
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'practical_db',
    },
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/execution_logs',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    submissionServiceUrl: process.env.SUBMISSION_SERVICE_URL || undefined,
    assessmentsServiceUrl: process.env.ASSESSMENTS_SERVICE_URL || undefined,
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      bucket: process.env.S3_BUCKET || 'practical-files',
      region: process.env.S3_REGION || undefined,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'false') === 'true',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_TOKEN_SECRET || 'dev_secret',
      refreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'dev_refresh',
      accessExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m',
      refreshExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRES || '30d',
    },
  };
}
