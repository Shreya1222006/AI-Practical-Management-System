import express from 'express';
import { createSubmission } from './controllers/submissionsController';
import submissionsRouter from './routes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/submissions', submissionsRouter);
app.post('/submit', createSubmission);

export default app;
