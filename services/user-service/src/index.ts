import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const port = process.env.PORT || process.env.PORT_USER_SERVICE || 4025;

app.listen(Number(port), () => {
  console.log(`user-service listening on ${port}`);
});
