import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const port = Number(process.env.PORT) || Number(process.env.PORT_USER_SERVICE) || 4060;

app.listen(port, () => {
  console.log(`[User Service] Listening on port ${port}`);
});

export default app;
