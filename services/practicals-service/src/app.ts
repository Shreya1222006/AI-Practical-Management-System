import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import practicalsRouter from './routes/practicals';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/practicals', practicalsRouter);

export default app;

