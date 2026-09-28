import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { getConfig } from '../../../libs/shared/config';
import { initDb } from './utils/db';

const port = Number(process.env.PORT) || Number(process.env.PORT_USER_SERVICE) || 4060;
const config = getConfig();

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`[User Service] Listening on port ${port}`);
      console.log(`[Database] Connected to PostgreSQL database: ${config.postgres.database}`);
    });
  })
  .catch((err) => {
    console.error('[User Service] Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
