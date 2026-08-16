import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const port = process.env.PORT || process.env.PORT_AUTH_SERVICE || 4010;

app.listen(Number(port), () => {
  console.log(`auth-service listening on ${port}`);
});

