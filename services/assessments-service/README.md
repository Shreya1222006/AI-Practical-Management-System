# assessments-service

Service to manage assessments, test-cases, deadlines and scoring policy.

Key endpoints
- `POST /assessments` - create assessment
- `GET /assessments` - list assessments (filter by `course_id`)
- `GET /assessments/:id` - get assessment
- `POST /assessments/:id/presign-resource` - request a presigned upload URL from `file-service`

Environment
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `FILE_SERVICE_URL` - base URL for `file-service` (optional)
- `REDIS_URL` - for publishing events (optional)

Run locally
```bash
cd services/assessments-service
npm install
npm run dev
```
# Assessments Service

Manages assessments, test cases, and publishing. Exposes endpoints for creating and updating assessments.

Local dev: `npm run dev`.
