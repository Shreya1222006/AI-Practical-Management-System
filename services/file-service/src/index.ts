import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const port = process.env.PORT || process.env.PORT_FILE_SERVICE || 4040;

app.listen(Number(port), () => {
  console.log(`file-service listening on ${port}`);
});

