# submission-service

Service to receive student submissions, validate, persist metadata and attachments, and publish execution job requests.

Endpoints
- `POST /submissions` - create a submission
- `GET /submissions` - list recent submissions (filter by `submitter_id`)
- `GET /submissions/:id` - get a submission

Features
- Stores `attachments` and `metadata` as JSONB in Postgres (see `entities.md`).
- Publishes `submission.created` events to Redis channel `submissions.events` (if `REDIS_URL` configured).
- Simple rate-limiter: 10 submissions per minute per IP (uses Redis when available; otherwise in-memory).
- Anti-spam: reject identical submission from same `submitter_id` for same `assessment_id` within 10 seconds.

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
