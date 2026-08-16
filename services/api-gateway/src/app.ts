import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// basic route proxy placeholders
app.get('/api/v1/hello', (_req, res) => res.json({ msg: 'API Gateway' }));

export default app;
