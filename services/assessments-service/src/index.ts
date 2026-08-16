import express from 'express';
import bodyParser from 'body-parser';
import { getConfig } from '../../libs/shared/config';
import { initDb } from './utils/db';
import assessmentsRouter from './routes';

const config = getConfig();

const app = express();
app.use(bodyParser.json());

app.use('/assessments', assessmentsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4003;

initDb(config).then(() => {
  app.listen(port, () => console.log(`assessments-service listening on ${port}`));
}).catch(err => {
  console.error('Failed to initialize DB', err);
  process.exit(1);
});
import app from './app';

const port = Number(process.env.PORT) || Number(process.env.PORT_ASSESSMENTS_SERVICE) || 4050;
app.listen(port, () => {
  console.log(`Assessments service running on port ${port}`);
});
