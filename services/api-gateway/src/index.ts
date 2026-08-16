import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConfig } from '../../libs/shared/config';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { proxyHandler } from './proxy';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
const config = getConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// attach request id
app.use((req, _res, next) => {
  if (!req.headers['x-request-id']) req.headers['x-request-id'] = uuidv4();
  next();
});

app.use(rateLimiter);
app.use(authMiddleware);

// health aggregator
app.get('/health', async (_req, res) => {
  res.json({ status: 'ok', services: ['practicals', 'assessments', 'submissions', 'file', 'auth'] });
});

// proxy routes
app.use('/api/practicals', proxyHandler('PRACTICALS_SERVICE_URL'));
app.use('/api/assessments', proxyHandler('ASSESSMENTS_SERVICE_URL'));
app.use('/api/submissions', proxyHandler('SUBMISSION_SERVICE_URL'));
app.use('/api/files', proxyHandler('FILE_SERVICE_URL'));
app.use('/api/users', proxyHandler('USER_SERVICE_URL'));

const port = Number(process.env.PORT || config.API_GATEWAY_PORT || 3000);
app.listen(port, () => console.log(`api-gateway listening on ${port}`));
import app from './app';

const port = Number(process.env.PORT) || Number(process.env.PORT_API_GATEWAY) || 4000;
app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});
