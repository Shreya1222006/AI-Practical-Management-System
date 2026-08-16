import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// placeholder worker endpoints
app.post('/run', (req, res) => {
  // in production this would enqueue a Docker execution job
  res.json({ jobId: 'job-placeholder' });
});

export default app;
