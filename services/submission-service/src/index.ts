import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initDb } from './utils/db';

const port = Number(process.env.PORT) || Number(process.env.PORT_SUBMISSION_SERVICE) || 4020;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`submission-service listening on ${port}`);
      console.log('[Database] PostgreSQL connection verified');
    });
  })
  .catch(err => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });

