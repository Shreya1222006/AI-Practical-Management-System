import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { getConfig } from '../../../libs/shared/config';
import { initDb } from './utils/db';

const port = process.env.PORT || process.env.PORT_FILE_SERVICE || 4040;
const config = getConfig();

initDb()
  .then(() => {
    app.listen(Number(port), () => {
      console.log(`file-service listening on ${port}`);
      console.log(`[Database] Connected to PostgreSQL database: ${config.postgres.database}`);
    });
  })
  .catch((err) => {
    console.error('file-service failed to initialize database:', err);
    process.exit(1);
  });

