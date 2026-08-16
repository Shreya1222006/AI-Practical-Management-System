import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { getConfig } from '../../../libs/shared/config';
import { initDb } from './utils/db';

const config = getConfig();
const port = Number(process.env.PORT) || Number(process.env.PORT_SUBMISSION_SERVICE) || 4020;

initDb(config)
  .then(() => {
    app.listen(port, () => console.log(`submission-service listening on ${port}`));
  })
  .catch(err => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });

