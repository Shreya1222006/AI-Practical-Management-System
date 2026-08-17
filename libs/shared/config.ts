import dotenv from 'dotenv';
dotenv.config();

export type AppConfig = {
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
  apiGatewayUrl: string;
  authServiceUrl: string;
  userServiceUrl: string;
  practicalsServiceUrl: string;
  assessmentsServiceUrl: string;
  submissionServiceUrl: string;
  executionRunnerUrl: string;
  fileServiceUrl: string;
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

export function getConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 0),
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'practical_db',
    },
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/vpl_logs',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:4000',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4010',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4060',
    practicalsServiceUrl: process.env.PRACTICALS_SERVICE_URL || 'http://localhost:4070',
    assessmentsServiceUrl: process.env.ASSESSMENTS_SERVICE_URL || 'http://localhost:4050',
    submissionServiceUrl: process.env.SUBMISSION_SERVICE_URL || 'http://localhost:4020',
    executionRunnerUrl: process.env.EXECUTION_RUNNER_URL || 'http://localhost:4030',
    fileServiceUrl: process.env.FILE_SERVICE_URL || 'http://localhost:4040',
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BUCKET || 'practical-files',
      region: process.env.S3_REGION || undefined,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_TOKEN_SECRET || 'dev_access_secret_key_123',
      refreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'dev_refresh_secret_key_123',
      accessExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m',
      refreshExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRES || '30d',
    },
  };
}
