# assessment-grader

Consumes `execution.completed` events, grades runs against assessment `test_cases`, stores `assessment_submissions` in Postgres, uploads artifacts via `file-service` (optional), and publishes `grading.completed`.

Env vars
- `POSTGRES_*` (for `assessment_submissions` persistence)
- `MONGO_URI` (read execution job logs)
- `REDIS_URL` (subscribe/publish)
- `ASSESSMENTS_SERVICE_URL` (to fetch assessment test cases)
- `SUBMISSION_SERVICE_URL` (to fetch submission metadata)
- `FILE_SERVICE_URL` (optional)

Run locally
```bash
cd services/assessment-grader
npm install
npm run dev
```
# Assessment Grader

Worker service that listens for completed execution jobs and computes auto-scores for assessments.
