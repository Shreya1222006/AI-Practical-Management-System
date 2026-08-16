# Services Completion Sequence

This document defines the sequence in which we'll complete each microservice and the substeps to implement between them. Follow the order below; each service includes standard substeps to ensure consistent quality, deployability and integration.

## High-level order
1. Infrastructure & shared infra (local): Postgres, MongoDB, Redis, MinIO, RabbitMQ (or Kafka)
2. Auth & Identity: `auth-service`
3. Core Users: `user-service`
4. File handling: `file-service`
5. Content services: `practicals-service`, `assessments-service`
6. Submission flow: `submission-service`
7. Execution & grading workers: `execution-runner`, `assessment-grader`
8. API Gateway & BFF: `api-gateway`
9. Observability & CI: logging, metrics, e2e tests, CI pipeline

---

## Per-service standard substeps (apply to every service)
1. Scaffold
   - Create service folder, `package.json`, `tsconfig.json`, basic `src/` layout and `README.md`.
   - Add `Dockerfile` and `docker-compose` service block placeholder.
2. Configuration
   - Implement config loader reading from environment variables (support `.env` in dev).
   - Document required env vars in `README.md`.
3. Persistence & data
   - Add DB client (Postgres or Mongo) and connection wrapper.
   - Create DB migration SQL or Mongoose schema; add a simple migration/seed script.
4. Domain models & repositories
   - Implement typed domain models and a repository layer with basic CRUD operations.
5. API & business logic
   - Implement HTTP routes (health, create/read/list) and validation.
   - Implement core service business logic and DTOs.
6. Messaging / events
   - Add publisher/subscriber integration for domain events (e.g., RabbitMQ/Kafka topics): publish important events; subscribe when needed.
7. Security
   - Integrate auth checks (JWT validation) and role-based guards as required.
8. Tests
   - Add unit tests for core logic and basic integration tests (in-memory DB or test containers).
9. Docs & Docker
   - Finalize `README.md` with run instructions, env vars, ports.
   - Add `Dockerfile` build optimizations and a lightweight dev command.
10. CI & checks
   - Add lint, typecheck, test steps to repo-level CI config.

---

## Detailed sequence and service-specific notes

### 1. Infrastructure & shared libs (first)
- Why first: services depend on infra (Postgres, Redis, MinIO, Mongo, RabbitMQ).
- Substeps:
  - Add `docker-compose.yml` nodes for infra with persistent volumes.
  - Create a shared `libs/` or `packages/` for common code (config, logger, types).
  - Document `.env.example` and common secret names.

### 2. `auth-service`
- Deliverables: JWT issuance, token introspection, user registration hooks, password reset.
- Substeps:
  - DB table for accounts and credentials (Postgres).
  - Implement endpoints: `/register`, `/login`, `/refresh`, `/introspect`.
  - Issue signed JWTs and publish `user.created` events.
  - Provide middleware snippet (or public JWKs) for other services to validate tokens.

### 3. `user-service`
- Deliverables: user profiles, roles, permissions, search endpoints.
- Substeps:
  - Models: `users`, `profiles`, `roles` in Postgres.
  - Endpoints: get/update profile, list users, assign role.
  - Subscribe to `user.created` from `auth-service` or call internal user creation API.

### 4. `file-service`
- Deliverables: presigned upload/download URLs, attachment metadata, retention policy.
- Substeps:
  - Integrate MinIO (S3 SDK) and store metadata in Postgres.
  - Endpoints: `POST /presign`, `GET /meta/:id`, `DELETE /:id`.
  - Ensure ACL and signed URL expiry settings.

### 5. `practicals-service`
- Deliverables: CRUD for practicals, attachments, versioning.
- Substeps:
  - Model practicals with `metadata JSONB` for subject fields.
  - Endpoints: create/list/get/update practicals and attach files (via `file-service`).
  - Publish events: `practical.created`, `practical.updated`.

### 6. `assessments-service`
- Deliverables: assessment templates, test-cases, deadlines, scoring policy.
- Substeps:
  - Model assessments and test-case definitions (JSONB for flexibility).
  - Provide endpoints to create assessments and list available assessments per course.
  - Integrate with `file-service` for resources.

### 7. `submission-service`
- Deliverables: receive submissions, validation, store submission metadata, publish job request.
- Substeps:
  - Models: `submissions` (practical-agnostic) and link to `assessment_submissions` where applicable.
  - On create: store metadata and attachments, then publish `submission.created` event with payload for `execution-runner`.
  - Add rate limits and anti-spam protections.

### 8. `execution-runner`
- Deliverables: consume submission events, run student code in sandboxes, capture logs.
- Substeps:
  - Implement consumer to read `submission.created` or `execution.request` queue.
  - Start a containerized runner (off-process) with resource limits; stream logs to Mongo `execution_jobs` collection.
  - Publish `execution.completed` with results and artifacts locations.

### 9. `assessment-grader`
- Deliverables: grade executions against test-cases, produce structured grades, store `assessment_submissions`.
- Substeps:
  - Consume `execution.completed` events and fetch test-case expectations from `assessments-service` if necessary.
  - Compute score, attach trace logs and artifacts to `file-service`/MinIO, persist `assessment_submissions` in Postgres.
  - Publish `grading.completed` event.

### 10. `api-gateway`
- Deliverables: consolidate routes, proxy to services, central auth enforcement, rate-limits, CORS.
- Substeps:
  - Implement route mapping for service endpoints and a health-dashboard.
  - Validate JWTs (delegate to `auth-service` or use public JWKs).
  - Add centralized logging and request tracing headers for distributed tracing.

---

## In-between tasks and cross-cutting concerns (do alongside services)
- Observability: integrate structured logging, OpenTelemetry traces, metrics (Prometheus).
- Security: secrets management, TLS for ingress, JWT rotation, key management.
- Testing: define e2e scenarios (student submit -> run -> grade) and add them to CI.
- Backups & migrations: automated DB migrations (e.g., Flyway/TypeORM migrations) and backup plans before data migrations.
- Scaling & retries: design retry policies for messaging consumers; idempotency for event handlers.

---

## Recommended pacing and checkpoints
- Sprint 1: Infra + `auth-service` + `user-service` (local dev working stack).
- Sprint 2: `file-service` + `practicals-service` + `assessments-service` (CRUD & attachments).
- Sprint 3: `submission-service` + `execution-runner` (end-to-end submit -> run).
- Sprint 4: `assessment-grader` + `api-gateway` + observability + CI.

Each sprint ends with: local `docker-compose up --build`, running core e2e test (sample submission flow), review and migrate DB if needed.

---

## Next immediate actions I can take now
- Create this `sequence.md` (done).
- Scaffold the next service you want me to implement (I suggest `assessments-service`).

If you want, tell me which service to scaffold next or I can start scaffolding `assessments-service` now.
