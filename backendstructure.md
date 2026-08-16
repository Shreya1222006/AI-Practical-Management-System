# Backend Structure — Directory Layout and File Roles

This document describes the recommended backend directory layout for this project and the role of each file/folder. Use this as a developer reference when implementing or navigating the backend.

## Overview

- Language: Node.js + TypeScript (recommended)
- Pattern: Modular services (API, execution, workers), layered architecture (routes → controllers → services → data access)
- Config: environment-based config files; secrets via `.env`


## Top-level layout

- `package.json`: Project metadata, scripts, dependencies.
- `tsconfig.json`: TypeScript compiler settings.
- `Dockerfile`: Container image build instructions for the API server.
- `docker-compose.yml`: Development orchestration (Postgres, MongoDB, Redis, MinIO, API, workers).
- `.env.example`: Example environment variables and documentation.
- `migrations/`: SQL migration scripts for schema changes (e.g. `20260815_separate_assessment_submissions.sql`).
- `scripts/`: Utility scripts (seed, test-data, db-reset, backups).
- `README.md`: Project overview and run instructions.


## `src/` (main application)

- `src/index.ts` or `src/server.ts`: Application bootstrap — reads config, connects to DBs, starts HTTP server and worker processes.
- `src/app.ts`: Express app setup — middleware, routes, error handlers (exported for tests).
- `src/config/`:
  - `index.ts`: Central config loader (loads `.env`, validates settings, exports typed config).
  - `logger.ts`: Logger setup (Pino/Winston) used across services.

- `src/api/` (HTTP layer)
  - `routes/`:
    - `index.ts`: Route mounting (e.g., `/api/v1/practicals`, `/api/v1/submissions`).
    - `practicals.routes.ts`: Practical endpoints (create, assign, list).
    - `assessments.routes.ts`: Assessment endpoints (create, test-case management).
    - `submissions.routes.ts`: Run/submit endpoints and submission history.
  - `controllers/`:
    - `practicals.controller.ts`: Request handlers, parameter validation, call services.
    - `assessments.controller.ts`
    - `submissions.controller.ts`
  - `validators/`:
    - `practical.validator.ts`: Request body/params validation (Joi/zod).
    - `assessment.validator.ts`

- `src/services/` (business logic)
  - `practicals.service.ts`: Implements create/patch/list/assign logic, uses models and attachments.
  - `assessments.service.ts`: Create assessments, manage test cases, publish/assign.
  - `submissions.service.ts`: Orchestrates runs/submits, persists submission summary, delegates execution jobs.
  - `grading.service.ts`: Auto-grade logic orchestration (invokes comparison, scoring), and manual override flows.
  - `file.service.ts`: Uploads/downloads to S3/MinIO, signs URLs.

- `src/models/` (DB access layer)
  - `pg/` or `repos/`:
    - `users.repo.ts`: Postgres queries for `users` table.
    - `practicals.repo.ts`: Queries and helper functions for practicals.
    - `assessments.repo.ts`: Queries for assessments and `test_cases`.
    - `submissions.repo.ts`: Insert/select/update for `submissions` (lightweight summary).
    - `assessment_submissions.repo.ts`: CRUD for `assessment_submissions`.
  - `mongo/`:
    - `executionJobs.model.ts`: MongoDB access abstraction for `execution_jobs` collection (logs and test run traces).

- `src/db/`
  - `pgClient.ts`: PostgreSQL pool / Prisma / TypeORM setup.
  - `mongoClient.ts`: MongoDB connection helper.
  - `redisClient.ts`: Redis connection (queues and caches).
  - `migrations/` (optional): programmatic migration runner or helper.

- `src/execution/` (execution orchestration)
  - `queue/`:
    - `jobProducer.ts`: Create run/submit jobs on BullMQ.
    - `jobConsumers.ts`: Worker registration and handlers.
  - `runner/`:
    - `dockerRunner.ts`: Container lifecycle, resource limits, capture stdout/stderr.
    - `testRunner.ts`: Assessment-specific per-test orchestration and comparison rules.
  - `sandbox/`: helpers for mounting datasets, preparing container workspace.

- `src/workers/` (background workers)
  - `worker.ts`: Worker entrypoint (consumes `execution:run`, `execution:submit` queues).
  - `cleanup.worker.ts`: Periodic cleanup jobs (old artifacts, TTL pruning).

- `src/sockets/`
  - `socket.ts`: WebSocket setup (Socket.io) and event handlers for real-time job updates.

- `src/middleware/`
  - `auth.middleware.ts`: JWT verification, role extraction, tenant scoping.
  - `error.middleware.ts`: Centralized error handling and HTTP response mapping.
  - `rateLimit.middleware.ts`: Run/submit throttling per user via Redis.

- `src/jobs/` (other background jobs)
  - `notifications.job.ts`: Push notifications (in-app/email) for deadlines/results.
  - `reports.job.ts`: Scheduled report generation.

- `src/utils/`:
  - `time.ts`: helpers for time formatting and TTL calculations.
  - `validation.ts`: shared validators and sanitizers.
  - `jsonb.ts`: JSONB helpers for constructing/updating Postgres JSON fields.

- `src/types/`:
  - `index.d.ts` or `types.ts`: Shared TypeScript types (ActivityType, SubmissionStatus, DB interfaces).

- `src/tests/` or `tests/`:
  - Unit tests for controllers / services with Jest or Vitest.
  - `integration/` tests for DB interactions (use test containers or a test DB).


## Scripts & tooling

- `scripts/seed.ts`: Seed initial roles, subjects, env slugs.
- `scripts/run-dev.sh` / `run-dev.ps1`: Convenience scripts to start `docker-compose` and watchers.
- `scripts/migrate.sh`: Wrapper to run SQL migrations against a target DB.


## Migration & deployment notes

- Keep migrations idempotent and reversible where possible.
- Use a DB migration tool (Flyway, Liquibase, or node-pg-migrate). Put SQL files under `migrations/` with timestamps.
- For production deploys: run migrations before rolling app instances; workers should handle schema compatibility (feature flags if needed).


## Example Minimal File Map (quick reference)

- `src/index.ts` — bootstrap
- `src/app.ts` — Express app
- `src/config/index.ts` — config loader
- `src/routes/*.routes.ts` — REST endpoints
- `src/controllers/*.controller.ts` — handlers
- `src/services/*.service.ts` — business logic
- `src/models/*repo.ts` — DB access
- `src/execution/dockerRunner.ts` — execution engine
- `src/workers/worker.ts` — background consumers
- `migrations/*.sql` — schema changes
- `migrations/20260815_separate_assessment_submissions.sql` — example migration added


---

## Microservice Architecture (recommended)

The project should follow a microservice architecture. Each service is a small, independently deployable unit that owns its data and API. Below is the recommended repo layout and per-service roles.

Top-level layout (microservices):

```
/services
  /api-gateway
  /auth-service
  /user-service
  /practicals-service
  /assessments-service
  /submission-service
  /assessment-grader
  /execution-runner
  /file-service
  /notification-service
  /analytics-service
/libs
/infra
/migrations
```

Per-service internal structure (same pattern for each service):

- `src/index.ts` — service bootstrap (config, DB, server, health checks).
- `src/app.ts` — Express/Fastify app wiring or gRPC server.
- `src/config/` — typed config loader and env validation.
- `src/routes/` or `src/handlers/` — HTTP/gRPC endpoints.
- `src/controllers/` — thin orchestration layer for requests.
- `src/services/` — domain business logic.
- `src/repos/` — data access; this service owns schema and migrations.
- `src/worker/` — background consumers if required.
- `src/tests/` — unit & integration tests.
- `Dockerfile`, `package.json`, `README.md`, `migrations/` at service root.

Core services and responsibilities (short):

- `api-gateway`: single entrypoint, JWT verification, request routing, rate-limiting, BFF endpoints for UI.
- `auth-service`: login/logout, refresh tokens, OAuth hooks, refresh token store.
- `user-service`: user profiles, roles, enrollments, teacher assignment APIs.
- `practicals-service`: practical CRUD, metadata JSONB handling, attachments metadata.
- `assessments-service`: assessment CRUD, `test_cases` management, publishing.
- `submission-service`: ingest run/submit requests, persist submission summaries, emit events (`submission.created`).
- `execution-runner`: horizontally scalable worker pool; execute code in Docker; store detailed logs in MongoDB; upload artifacts to object store; emit `execution.completed` events.
- `assessment-grader`: consumes `execution.completed` for assessment runs, computes `auto_score`, writes `assessment_submissions` (or calls `submission-service`).
- `file-service`: presigned URL generation, virus-scan hooks, scheduled lifecycle jobs.
- `notification-service` & `analytics-service`: handle notifications and reporting respectively.

Communication patterns:

- Synchronous: REST or gRPC for CRUD and immediate reads.
- Asynchronous: Message bus (RabbitMQ/Kafka) for events: `submission.created`, `execution.started`, `execution.completed`, `grading.completed`, `notification.enqueue`.
- Shared libraries: lightweight `libs/` for shared types and SDK clients (kept minimal to avoid coupling).

Data ownership & storage:

- Each service should own its primary datastore (schema) to avoid coupling. Prefer Postgres per service for structured data.
- Execution logs and append-heavy traces remain centralized in MongoDB.
- Object store (S3/MinIO) is shared; file metadata kept in service-owned tables.

Deployment & CI/CD notes:

- CI per service: build → test → publish image → deploy.
- Use Helm/Kustomize under `/infra` for environment manifests.
- Run migrations per-service (in `services/<service>/migrations`) or a centralized runner that targets specific DBs.

Migration path from monolith/docs:

1. Start by extracting low-coupling services: `submission-service` and `execution-runner`.
2. Introduce message bus and have the monolith publish events while new services subscribe.
3. Move owners of tables incrementally into service schemas and switch reads to service APIs.
4. Once functionality is verified, deprecate monolith endpoints.

If you'd like, I can scaffold the requested initial services (`submission-service`, `execution-runner`, `assessment-grader`) with minimal boilerplate. Which should I scaffold first?

If you want, I can:
- Generate a starter `src/` scaffold with empty files and exports, or
- Create example `src/index.ts`, `src/app.ts`, and `src/config/index.ts` to match this layout.

Which would you like next?