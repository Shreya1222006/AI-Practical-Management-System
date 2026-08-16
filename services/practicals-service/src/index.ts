import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const port = process.env.PORT || process.env.PORT_PRACTICALS_SERVICE || 4070;

app.listen(Number(port), () => {
  console.log(`practicals-service listening on ${port}`);
});

