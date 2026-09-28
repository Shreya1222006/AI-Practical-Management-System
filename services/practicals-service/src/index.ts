import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { getConfig } from '../../../libs/shared/config';
import { initDb } from './utils/db';

const port = process.env.PORT || process.env.PORT_PRACTICALS_SERVICE || 4070;
const config = getConfig();

initDb()
  .then(() => {
    app.listen(Number(port), () => {
      console.log(`practicals-service listening on ${port}`);
      console.log(`[Database] Connected to PostgreSQL database: ${config.postgres.database}`);
    });
  })
  .catch((err) => {
    console.error('practicals-service failed to initialize database:', err);
    process.exit(1);
  });

