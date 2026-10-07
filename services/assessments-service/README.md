# assessments-service

Service to manage reusable DSA questions, assessments, test cases, deadlines and scoring policy.

Key endpoints
- `POST /questions` - create a reusable question with its test cases
- `POST /assessments` - create assessment using existing question IDs
- `GET /assessments` - list assessments (filter by `course_id`)
- `GET /assessments/:id` - get assessment
- `POST /assessments/:id/presign-resource` - request a presigned upload URL from `file-service`

Create a question with `title`, `prompt`, and a nonempty `test_cases` array. Each test case has a string `expected_output` and may include `input`, `points`, and `is_hidden`. Questions may also set `language`, `environment`, `time_limit_sec`, and `memory_limit_mb`.

Create an assessment with `title`, `subject_id`, and a nonempty `question_ids` array. The question IDs are attached in the supplied order, and the same question can be used by multiple assessments.

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
