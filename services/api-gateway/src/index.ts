import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../../libs/shared/config';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { proxyHandler } from './proxy';

dotenv.config();
const config = getConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// attach request id
app.use((req, _res, next) => {
  if (!req.headers['x-request-id']) req.headers['x-request-id'] = uuidv4();
  next();
});

app.use(rateLimiter);

// Health check endpoint (unauthenticated)
app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    gateway: 'api-gateway',
    services: ['auth', 'users', 'practicals', 'assessments', 'submissions', 'execution', 'files']
  });
});

// Proxy routes
app.use('/api/auth', proxyHandler('AUTH_SERVICE_URL', 'http://localhost:4010'));
app.use('/api/users', authMiddleware, proxyHandler('USER_SERVICE_URL', 'http://localhost:4060'));
app.use('/api/practicals', authMiddleware, proxyHandler('PRACTICALS_SERVICE_URL', 'http://localhost:4070'));
app.use('/api/assessments', authMiddleware, proxyHandler('ASSESSMENTS_SERVICE_URL', 'http://localhost:4050'));
app.use('/api/submissions', authMiddleware, proxyHandler('SUBMISSION_SERVICE_URL', 'http://localhost:4020'));
app.use('/api/execution', authMiddleware, proxyHandler('EXECUTION_RUNNER_URL', 'http://localhost:4030'));
app.use('/api/files', authMiddleware, proxyHandler('FILE_SERVICE_URL', 'http://localhost:4040'));

const port = Number(process.env.PORT || process.env.PORT_API_GATEWAY || 4000);
app.listen(port, () => console.log(`[API Gateway] Listening on port ${port}`));

export default app;
