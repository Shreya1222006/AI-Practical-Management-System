import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/assessments', (req, res) => {
  // placeholder: create assessment and test cases
  res.json({ assessmentId: 'placeholder-assessment-id' });
});

export default app;
