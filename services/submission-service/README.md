# submission-service

Service to receive student submissions, persist metadata and attachments, and publish execution job requests.

Endpoints
- `POST /submissions` - create a submission
- `GET /submissions` - list recent submissions (filter by `submitter_id`)
- `GET /submissions/:id` - get a submission

Features
- Stores assessment-question submissions and grader output in `assessment_submissions`.
- Stores practical submissions separately in `practical_submissions`.
- Replaces the assessment row for an existing `submitter_id` + `assessment_id` + `question_id`; practical attempts are inserted as separate rows.
- Stores `attachments` and `metadata` as JSONB in Postgres.
- Publishes `submission.created` events to Redis channel `submissions.events` (if `REDIS_URL` configured).
- Simple rate-limiter: 10 submissions per minute per IP (uses Redis when available; otherwise in-memory).
- Rejects identical practical submissions from the same submitter and practical within 10 seconds.

Env vars: `POSTGRES_*`, `REDIS_URL`, `FILE_SERVICE_URL`

Run locally
```bash
cd services/submission-service
npm install
npm run dev
```
# Submission Service

Accepts run/submit requests, persists a lightweight submission record, and emits events for execution.

Local dev: `npm run dev`.
