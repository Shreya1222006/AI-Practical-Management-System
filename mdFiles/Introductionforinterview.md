# AI-Powered Virtual Practical Laboratory System

## Interview Preparation Guide

## 1. One-Minute Introduction

Our project is an AI-Powered Virtual Practical Laboratory System for computer engineering colleges. It gives students a browser-based environment where they can read practical assignments, write code, run it in an isolated Docker sandbox, and submit their work. Teachers can create practicals and assessments, review submissions, assign marks, and inspect execution results.

The backend follows a microservice architecture. Node.js, TypeScript, and Express are used for the services. PostgreSQL stores the main relational data, MongoDB stores execution logs, Redis supports queues and events, and S3/MinIO stores files such as datasets and manuals. Student code is executed in short-lived Docker containers with resource limits and no network access.

The system supports two important workflows:

- Practicals: students run and submit code; teachers manually review the code and output.
- Assessments: students run sample test cases and submit against all test cases; the grader calculates the score automatically.

The current scope is the base platform. AI chatbot, RAG, vector search, and AI-assisted evaluation are planned for a later phase.

## 2. Problem Statement

Traditional practical laboratories have several problems:

- Students need suitable machines and preconfigured software.
- Teachers have difficulty collecting, tracking, and comparing submissions.
- Running untrusted student code directly on a server is unsafe.
- Manual assessment workflows do not scale for coding examinations.
- Execution output, attempts, marks, and files are often stored separately.

This project provides a centralized and auditable platform for practical work and coding assessments. It standardizes execution environments, records every submission, and separates untrusted code execution from the application server.

## 3. Main Objectives

- Provide a common online laboratory for multiple subjects.
- Allow students to run C++, Python/Deep Learning, and SQL workloads.
- Execute code safely in isolated containers.
- Support regular practical assignments and timed assessments.
- Maintain submission history instead of overwriting previous attempts.
- Automate assessment grading using visible and hidden test cases.
- Give teachers access to code, output, scores, and feedback.
- Support multi-institution data using institution and role relationships.
- Store large files outside the relational database using object storage.

## 4. Users and Roles

### Student

- View assigned practicals and assessments.
- Write and run code.
- Submit attempts.
- View execution output, submission history, marks, and feedback.

### Teacher

- Create practical assignments and assessments.
- Add descriptions, starter code, test cases, due dates, and attachments.
- Assign activities to batches.
- Review practical submissions manually.
- View assessment scores and override marks when required.
- Export reports.

### Admin

- Manage users, roles, institutions, subjects, and settings.
- Monitor usage and system activity.
- Review audit information and reports.

## 5. High-Level Architecture

```text
Browser / React UI
        |
        v
API Gateway :4000
        |
        +--> Auth Service :4010 --------+
        +--> User Service :4060         |
        +--> Practicals Service :4070   |--> PostgreSQL
        +--> Assessments Service :4050  |
        +--> Submission Service :4020 --+
        +--> File Service :4040 -------> S3 / MinIO
        +--> Execution Runner :4030 ---> Docker containers
                                           |
                                           +--> MongoDB execution logs

Redis provides queues, events, pub/sub, rate limiting, and caching.
Assessment Grader consumes execution events and calculates assessment scores.
```

## 6. Microservices and Responsibilities

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 4000 | Single entry point, reverse proxy, authentication checks, rate limiting, and request tracing |
| Auth Service | 4010 | Registration, login, bcrypt password verification, JWT creation, and `/me` endpoint |
| User Service | 4060 | User profiles, roles, batches, enrollments, and user queries |
| Practicals Service | 4070 | Practical CRUD, metadata, starter code, assignments, and attachment coordination |
| Assessments Service | 4050 | Timed assessments, visible/hidden test cases, and assessment management |
| Submission Service | 4020 | Run/submit ingestion, attempt history, validation, and submission events |
| Execution Runner | 4030 | Queue consumption, Docker lifecycle, output collection, timeouts, and artifacts |
| Assessment Grader | Worker | Consumes execution results, compares test cases, calculates scores, and stores grading results |
| File Service | 4040 | Presigned S3/MinIO upload and download URLs plus attachment metadata |

### Why use microservices?

The services have separate responsibilities and can be developed, tested, deployed, and scaled independently. Execution is resource-intensive and has different security requirements from authentication or CRUD APIs, so it is isolated into its own service. The grader can also scale independently when many assessments finish at the same time.

The main tradeoff is operational complexity: service-to-service failures, event consistency, logging, deployment, and database ownership require more discipline than a monolith.

## 7. Communication Patterns

### Synchronous communication

The client sends REST requests to the API Gateway. The gateway forwards requests to the appropriate service. Synchronous REST is used when the client needs an immediate response, such as login, fetching a practical, or creating an assessment.

### Asynchronous communication

Long-running execution and grading are handled asynchronously through Redis queues and events. Typical events include:

- `submission.created`
- `execution.started`
- `execution.completed`
- `execution.failed`
- `grading.completed`

This prevents a long-running compiler or test suite from blocking an HTTP request.

### Example submission flow

```text
Student submits code
        |
        v
Submission Service stores submission and emits submission.created
        |
        v
Execution Runner consumes the job
        |
        v
Runner starts an isolated Docker container
        |
        v
Execution result and logs are stored/emitted
        |
        +--> Practical: result is shown for teacher review
        |
        +--> Assessment: Assessment Grader calculates score
```

## 8. Practical vs Assessment

### Practical workflow

A practical is a regular lab assignment. The student writes code, runs it, sees stdout/stderr and execution information, and submits the code. The teacher manually reviews the code and output and assigns marks.

### Assessment workflow

An assessment is an exam-style activity. The student can run visible sample test cases. On submission, the system executes all test cases, including hidden cases. The grader compares actual and expected output, calculates the score, stores per-test-case results, and allows teacher review or override.

### Why keep them separate?

Practicals are open-ended and may produce files, plots, SQL grids, or notebooks. They need flexible output and manual review. Assessments require deterministic test-case execution, strict comparison, time limits, and automatic scoring. Separating the workflows keeps their business rules clear.

## 9. Supported Execution Environments

| Environment | Use case |
|---|---|
| `cpp-gcc` | C++, DSA, OOP, and OS practicals |
| `python-dl` | Python, ML, Deep Learning, and Data Science workloads |
| `postgres-dbms` | SQL and DBMS practicals |

The execution environment contains the Docker image, language, command template, default time limit, memory limit, and supported capabilities.

## 10. Secure Code Execution

Student code is untrusted, so it must not run directly inside the API process or on the host machine. The runner creates a short-lived Docker container for each job.

Important controls in the runner include:

- `--network none` prevents outbound network access.
- `--memory` limits memory usage.
- `--cpus` limits CPU usage.
- A per-job workspace is mounted into `/workspace`.
- A timeout watchdog kills jobs that run too long.
- Containers use `--rm` so they are removed after execution.
- stdout, stderr, exit code, execution time, and artifacts are captured.
- Source files and generated artifacts are handled separately.

### Security improvements for production

A production deployment should additionally use a dedicated worker host or Kubernetes sandbox, read-only mounts wherever possible, non-root containers, seccomp/AppArmor profiles, process and file-count limits, container image scanning, strict input validation, and resource quotas per user or institution.

## 11. Data Storage Design

### PostgreSQL

PostgreSQL is the source of truth for structured relational data:

- Institutions and batches
- Users, roles, permissions, and enrollments
- Practicals and assessments
- Test cases
- Submissions and assessment submissions
- Refresh tokens and attachment metadata

PostgreSQL is appropriate because the system needs foreign keys, transactions, uniqueness constraints, joins, and consistent marks/submission records.

### MongoDB

MongoDB stores execution jobs, raw container output, and debug traces. These records are append-heavy and can vary by execution environment, so a document store is useful.

### Redis

Redis is used for:

- Background job queues
- Pub/sub events
- Rate limiting
- Short-lived cache data
- Potential token blacklist or session data

### S3/MinIO

Object storage is used for PDFs, datasets, SQL dumps, notebooks, plots, and other larger files. The database stores metadata and object keys rather than unnecessarily storing large binary files.

## 12. Important Database Design Concepts

- `institution_id` supports tenant separation.
- `users` stores identity and role information.
- `user_roles` supports role assignment and scope.
- `practicals` and `assessments` use metadata fields for subject-specific properties.
- `test_cases` belongs to assessments and stores expected output and points.
- `submissions` records an immutable attempt history.
- `assessment_submissions` stores score and grading details.
- `activity_attachments` stores file metadata and object-storage references.

Migrations are stored under `migrations/`. Services use `DATABASE_URL` or `POSTGRES_DATABASE_URL` when available, with individual PostgreSQL variables as fallback. Migrations must be applied before starting services that query their tables.

## 13. Authentication and Authorization

The authentication flow is:

1. The user registers with email, password, and name.
2. The auth service hashes the password using bcrypt.
3. The hash is stored in PostgreSQL; the raw password is never stored.
4. During login, bcrypt compares the supplied password with the stored hash.
5. The service signs a JWT containing claims such as user ID, email, and role.
6. The client sends the token using the `Authorization: Bearer <token>` header.
7. The API Gateway or service validates the token before allowing protected operations.

JWT is stateless and works well across multiple service instances. Refresh tokens can be stored and revoked for longer sessions. Access tokens should be short-lived, and secrets must be supplied through environment variables or a secret manager.

Authorization should be enforced at more than one level: gateway authentication, service-level role checks, institution/batch scoping, and database queries that filter by the authorized tenant.

## 14. Reliability and Scalability

### How the system handles many students running code

Execution requests are placed in a Redis-backed queue. Workers consume jobs and start containers with resource limits. The runner can be horizontally scaled by adding more worker instances. The API remains responsive because it does not wait for code execution to finish.

### Failure handling

- Database failures are surfaced during service initialization.
- Execution failures include stderr and exit status.
- Timeouts kill the container and mark the job as timed out.
- Events allow downstream services to react without tightly coupling the request path.
- Health endpoints help detect unavailable services.
- Structured logs and MongoDB execution records support diagnosis.

### Important distributed-system concerns

- Events may be delivered more than once, so consumers should be idempotent.
- A submission should have a stable ID for correlation across services.
- Retries should use backoff and a dead-letter strategy.
- Database writes and event publishing need an outbox or equivalent pattern when guaranteed delivery is required.
- Correlation IDs should be included in logs and requests.

## 15. API Gateway Role

The gateway provides one public entry point for the client:

- Routes requests to downstream services.
- Verifies or delegates JWT authentication.
- Applies rate limiting.
- Hides internal service ports from clients.
- Provides a consistent API structure such as `/api/auth`, `/api/users`, and `/api/submissions`.
- Can add request IDs, logging, CORS, and common error handling.

The gateway should not contain domain logic that belongs inside a service. Its main purpose is edge concerns and routing.

## 16. Configuration and Deployment

Configuration is loaded from environment variables. Important values include database URLs, service URLs, JWT secrets, Redis URL, MongoDB URI, S3/MinIO credentials, Docker image names, and execution limits.

Local infrastructure can be started with Docker Compose. The project includes PostgreSQL, MongoDB, Redis, MinIO, and service containers. Each service also has its own `package.json`, TypeScript configuration, and development command.

A typical local setup is:

```bash
docker-compose up -d
cd services/auth-service
npm install
npm run dev
```

Before testing authentication, apply the database migrations and verify that the `users` table exists in the database selected by `DATABASE_URL`.

## 17. Testing Strategy

Testing should be performed at multiple levels:

- Unit tests for controllers, validation, repositories, and grading rules.
- Integration tests for PostgreSQL, Redis, MongoDB, and service boundaries.
- API tests using Postman or automated HTTP tests.
- Execution tests for compilation errors, runtime errors, timeouts, memory limits, and successful output.
- Security tests for unauthorized access, role restrictions, network isolation, and malicious inputs.
- End-to-end tests for register, login, submit, execute, grade, and retrieve results.

Important execution test cases include:

- Valid C++ execution.
- Python execution with generated artifacts.
- SQL execution.
- Compilation failure.
- Runtime failure.
- Timeout.
- Memory limit violation.
- Multiple concurrent jobs.
- Duplicate event delivery.

## 18. Common Interview Questions and Answers

### What problem does your project solve?

It provides a secure and centralized virtual laboratory where students can complete practicals online and teachers can manage, execute, review, and grade submissions consistently.

### Why did you choose microservices?

Different parts of the system have different scaling and security needs. Authentication and CRUD operations are request-response workloads, while code execution and grading are long-running worker workloads. Microservices let us isolate and scale those workloads independently.

### Why PostgreSQL and MongoDB together?

PostgreSQL is used for structured data requiring relationships and transactions. MongoDB is used for flexible, append-heavy execution logs and raw traces. Each database is used where its data model is most suitable.

### Why is Redis needed?

Redis provides fast queues and pub/sub for asynchronous execution and grading. It also supports rate limiting and cache-like data. The queue prevents execution requests from blocking API threads.

### How do you prevent malicious code from harming the server?

We do not execute student code in the Node.js process. We run it inside a short-lived Docker container with no network, CPU and memory limits, a restricted workspace, and a timeout that kills the container. Production would add stronger container hardening and host isolation.

### How do you handle an infinite loop?

The runner starts a timeout watchdog. If the time limit is exceeded, it kills the Docker container and returns a timed-out execution result.

### How do you prevent duplicate submissions or duplicate grading?

Every submission has a stable ID and attempt record. Consumers should be idempotent by checking whether the event or grading result for that ID has already been processed. Rate limiting also reduces accidental or abusive repeated requests.

### What happens if the execution runner is down?

The submission can remain in a queued or pending state. The queue preserves work until a worker is available, while health checks and logs help operators identify the failure. A retry and dead-letter policy should be used in production.

### Why not execute code directly on the backend?

The backend process contains credentials and access to internal systems. Running untrusted code there could expose the host, database, filesystem, or network. Isolation reduces the blast radius of malicious or faulty code.

### What is the difference between authentication and authorization?

Authentication verifies who the user is, such as through login and JWT validation. Authorization decides what that user can do, based on role, institution, batch, and resource ownership.

### How are passwords stored?

Passwords are hashed with bcrypt before storage. The raw password is never stored, and login uses bcrypt comparison against the stored hash.

### Why use JWT?

JWT allows services to validate a signed identity token without maintaining server-side session state for every request. It works well across service instances, but tokens must have short expiry times and secure secrets.

### How do practicals differ from assessments?

Practicals are flexible assignments where teachers manually review code and output. Assessments use deterministic visible and hidden test cases to calculate a score automatically.

### How would you improve the current system?

I would add a formal migration runner, stronger schema version tracking, automated tests for every service, an outbox for reliable events, centralized observability, a dead-letter queue, stricter container isolation, and CI/CD with image scanning. I would then add the planned AI features separately so they do not affect the reliability of core execution and grading.

### What was a difficult technical issue?

Database configuration and schema alignment can be difficult in a multi-service system. A service may connect successfully but still fail when a required table or column is missing. The solution is to use one clear connection-string precedence rule, apply migrations to the same database selected by that connection string, and verify required relations before testing APIs.

## 19. Limitations and Honest Scope

- The current repository is primarily a backend and service foundation; the complete production frontend is part of the broader design.
- AI features are planned for a later phase and should not be presented as already implemented.
- Local Docker execution and production-grade sandboxing have different security requirements.
- A shared PostgreSQL database is convenient during development, but service-owned schemas or databases are preferable for stronger ownership boundaries.
- Event delivery, retries, idempotency, and observability need additional hardening for production scale.

## 20. Final Interview Summary

The strongest way to summarize the project is:

> We built a microservice-based virtual practical laboratory for engineering education. Students can write and execute code in isolated Docker environments, submit immutable attempts, and receive results. Teachers can manage practicals and assessments, manually review practical work, and use automated hidden-test grading for assessments. The API Gateway exposes a unified entry point, Redis decouples long-running execution through queues and events, PostgreSQL stores relational business data, MongoDB stores execution logs, and S3/MinIO stores larger files. The design focuses on isolation, accountability, scalability, and clear separation of responsibilities.

## 21. Quick Facts to Remember

- API Gateway: `4000`
- Auth Service: `4010`
- Submission Service: `4020`
- Execution Runner: `4030`
- Assessments Service: `4050`
- User Service: `4060`
- Practicals Service: `4070`
- File Service: `4040`
- Main API style: REST
- Main backend language: TypeScript on Node.js
- Relational database: PostgreSQL
- Execution-log database: MongoDB
- Queue and events: Redis
- File storage: S3/MinIO
- Execution isolation: Docker
- Authentication: bcrypt + JWT
- Practical grading: manual review
- Assessment grading: automated test-case scoring
- Future scope: AI-assisted features
