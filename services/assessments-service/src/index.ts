import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConfig } from '../../../libs/shared/config';
import { initDb } from './utils/db';
import assessmentsRouter from './routes';

dotenv.config();
const config = getConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/assessments', assessmentsRouter);
app.use('/', assessmentsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'assessments-service' }));

const port = Number(process.env.PORT) || Number(process.env.PORT_ASSESSMENTS_SERVICE) || 4050;

initDb(config)
  .then(() => {
    app.listen(port, () => console.log(`[Assessments Service] Listening on port ${port}`));
  })
  .catch((err) => {
    console.error('[Assessments Service] Failed to initialize DB:', err);
    process.exit(1);
  });

export default app;
