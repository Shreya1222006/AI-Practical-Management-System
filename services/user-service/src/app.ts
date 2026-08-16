import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import usersRouter from './routes/users';

const app = express();
app.use(helmet as any);
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/users', usersRouter);

export default app;

