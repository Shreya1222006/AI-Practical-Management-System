import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/submit', (req, res) => {
  // placeholder: accept submission metadata and enqueue execution job
  res.json({ submissionId: 'placeholder-id' });
});

export default app;
