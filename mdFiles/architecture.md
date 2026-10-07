# Virtual Practical Laboratory — System Architecture & Inter-Service Request Mapping

This document provides an exhaustive, end-to-end architectural breakdown of the **AI-Powered Virtual Practical Laboratory Platform**. It maps how requests enter the system, how each microservice interacts with others, which data stores are touched, and how synchronous REST calls and asynchronous event streams coordinate each workflow.

---

## Table of Contents
1. [High-Level System Topology](#1-high-level-system-topology)
2. [Microservices & Responsibilities Matrix](#2-microservices--responsibilities-matrix)
3. [Communication Paradigms](#3-communication-paradigms)
4. [End-to-End Functional Request Flows](#4-end-to-end-functional-request-flows)
   - [Flow 1: User Authentication & Token Introspection](#flow-1-user-authentication--token-introspection)
   - [Flow 2: Practical Assignment Creation & Dataset Attachment](#flow-2-practical-assignment-creation--dataset-attachment)
   - [Flow 3: Assessment Creation with Test Cases](#flow-3-assessment-creation-with-test-cases)
   - [Flow 4: Sandboxed Code Execution ("Run Code" Sandbox)](#flow-4-sandboxed-code-execution-run-code-sandbox)
   - [Flow 5: Practical Lab Submission & Teacher Review](#flow-5-practical-lab-submission--teacher-review)
   - [Flow 6: Assessment Submission & Automated Auto-Grading](#flow-6-assessment-submission--automated-auto-grading)
   - [Flow 7: File Upload & S3/MinIO Presigned URL Handling](#flow-7-file-upload--s3minio-presigned-url-handling)
5. [Data Store Ownership & Event Routing](#5-data-store-ownership--event-routing)
6. [Docker Sandbox Security & Execution Engine](#6-docker-sandbox-security--execution-engine)

---

## 1. High-Level System Topology

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer"]
        UI["Web Browser / Client (React + Monaco Editor)"]
    end

    subgraph GatewayLayer ["Gateway & Edge Layer"]
        GW["API Gateway (Port 4000)\n• JWT Verification\n• Rate Limiter\n• Reverse Proxy"]
    end

    subgraph CoreServices ["Core Domain Microservices (Node.js + Express)"]
        AUTH["Auth Service (:4010)\n• JWT & Password Hash"]
        USER["User Service (:4060)\n• Profiles & Roles"]
        PRAC["Practicals Service (:4070)\n• Lab Assignments & Metadata"]
        ASSESS["Assessments Service (:4050)\n• Test Cases & Quizzes"]
        FILE["File Service (:4040)\n• S3 Presigning & Metadata"]
        SUB["Submission Service (:4020)\n• Ingestion & Anti-Spam"]
    end

    subgraph ExecutionLayer ["Execution & Async Worker Layer"]
        RUNNER["Execution Runner (:4030)\n• Queue Consumer\n• REST Endpoint\n• Docker Lifecycle"]
        GRADER["Assessment Grader (Worker)\n• Auto-Scoring Engine\n• Comparison Rules"]
        DOCKER["Docker Engine Sandbox\n• vpl-cpp-runner:1.0\n• vpl-python-dl:1.0\n• vpl-postgres-runner:1.0"]
    end

    subgraph StorageLayer ["Persistence & Messaging Layer"]
        PG[("PostgreSQL\n(Relational Truth)")]
        MONGO[("MongoDB\n(Execution Logs)")]
        REDIS[("Redis\n(Queues, Pub/Sub, Rate Limits)")]
        S3[("S3 / MinIO\n(Datasets, PDFs, Notebooks)")]
    end

    UI -->|HTTP REST / JWT| GW
    
    GW -->|/api/auth| AUTH
    GW -->|/api/users| USER
    GW -->|/api/practicals| PRAC
    GW -->|/api/assessments| ASSESS
    GW -->|/api/files| FILE
    GW -->|/api/submissions| SUB
    GW -->|/api/execution| RUNNER

    AUTH --> PG
    USER --> PG
    PRAC --> PG
    ASSESS --> PG
    FILE --> PG
    FILE --> S3
    SUB --> PG

    PRAC -.->|HTTP POST /presign| FILE
    ASSESS -.->|HTTP POST /presign| FILE

    SUB -->|Publish: submission.created| REDIS
    RUNNER -->|Consume: job_queue / submissions.events| REDIS
    RUNNER -->|Spawn & Monitor| DOCKER
    RUNNER -->|Append Raw Logs| MONGO
    RUNNER -->|Publish: execution.completed| REDIS

    GRADER -->|Consume: execution.events| REDIS
    GRADER -->|Fetch Submission| SUB
    GRADER -->|Fetch Test Cases| ASSESS
    GRADER -->|Fetch Logs| MONGO
    GRADER -->|Write Score & Results| PG
    GRADER -->|Publish: grading.completed| REDIS
```

---

## 2. Microservices & Responsibilities Matrix

| Service | Port | Primary Responsibility | Data Store Owned | Direct Dependencies |
|---|---|---|---|---|
| **`api-gateway`** | `4000` | Single entry point, request tracing, rate limiting, JWT validation via `auth-service`, and request forwarding. | In-memory / Redis | `auth-service`, all downstream services |
| **`auth-service`** | `4010` | User registration, password hashing (bcrypt), login credential verification, JWT signing, `/me` introspection. | PostgreSQL (`users`, `refresh_tokens`) | PostgreSQL |
| **`user-service`** | `4060` | Profile management, student/teacher role queries, batch and course enrollments. | PostgreSQL (`users`, `user_roles`) | PostgreSQL |
| **`practicals-service`** | `4070` | CRUD for regular lab assignments, starter code, syllabus metadata, and attachment links. | PostgreSQL (`practicals`) | PostgreSQL, `file-service`, Redis |
| **`assessments-service`** | `4050` | Management of timed exams, LeetCode-style challenges, and visible/hidden test cases with point weights. | PostgreSQL (`assessments`, `test_cases`) | PostgreSQL, `file-service`, Redis |
| **`submission-service`** | `4020` | Ingestion of student code submissions, attempt versioning, rate limiting/anti-spam, and event dispatch. | PostgreSQL (`submissions`) | PostgreSQL, Redis |
| **`execution-runner`** | `4030` | Sandboxed Docker container orchestration across 3 consolidated environments, stdout/stderr capture, artifact collection, timeout enforcement. | MongoDB (`execution_jobs`), Host Filesystem (`./jobs`) | Docker Socket, Redis, MongoDB |
| **`assessment-grader`** | Worker | Consumes finished execution events, executes test-case comparison logic, calculates total score, and persists grade records. | PostgreSQL (`assessment_submissions`) | PostgreSQL, MongoDB, Redis, `submission-service`, `assessments-service` |
| **`file-service`** | `4040` | Generates secure time-limited presigned S3/MinIO upload/download URLs and manages attachment metadata. | PostgreSQL (`activity_attachments`), S3/MinIO | S3 / MinIO, PostgreSQL |

---

## 3. Communication Paradigms

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. Synchronous HTTP / REST                      │
│   Client ──► Gateway ──► Downstream Services (Immediate Read / Write)  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                  2. Asynchronous Event-Driven Messaging                │
│   Services emit domain events to Redis Pub/Sub channels:               │
│   • submissions.events  ──► (submission.created)                       │
│   • execution.events    ──► (execution.completed / execution.failed)   │
│   • grading.events      ──► (grading.completed)                        │
│   • practicals.events   ──► (practical.created / practical.updated)    │
│   • assessments.events  ──► (assessment.created)                       │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                     3. Background Work Queue (Redis)                   │
│   API Gateway / Runner ──► RPUSH 'job_queue' ──► Worker BLPOP          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End Functional Request Flows

### Flow 1: User Authentication & Token Introspection

Every incoming request to a protected endpoint passes through the API Gateway's authentication middleware.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser/Postman)
    participant GW as API Gateway (:4000)
    participant Auth as Auth Service (:4010)
    participant PG as PostgreSQL

    Note over User,Auth: 1. User Registration / Login Flow
    User->>GW: POST /api/auth/login { email, password }
    GW->>Auth: Forward to POST /auth/login
    Auth->>PG: Query user by email (SELECT password_hash)
    PG-->>Auth: Return user record
    Auth->>Auth: Verify password with bcrypt.compare()
    Auth->>Auth: Sign JWT token with accessSecret
    Auth-->>GW: Return { token, user: { id, email, name } }
    GW-->>User: 200 OK with JWT Token

    Note over User,Auth: 2. Authenticated Request Introspection
    User->>GW: GET /api/users/me (Header: Authorization: Bearer <token>)
    GW->>Auth: GET /auth/me (Header: Authorization: Bearer <token>)
    Auth->>Auth: jwt.verify(token)
    Auth->>PG: SELECT * FROM users WHERE id = sub
    PG-->>Auth: Return profile
    Auth-->>GW: 200 OK { id, email, name, role }
    GW->>GW: Attach req.user = user
    GW->>GW: Forward request to destination service
```

- **Call 1.1 (`POST /auth/register` or `/login`):** User sends credentials $\to$ `auth-service` writes or checks hash in PostgreSQL $\to$ generates signed JWT with `{ sub: userId, email, role }`.
- **Call 1.2 (`authMiddleware` on Gateway):** On every subsequent API call, Gateway calls `GET /auth/me` with the `Authorization` header $\to$ `auth-service` validates signature and attaches user context before routing.

---

### Flow 2: Practical Assignment Creation & Dataset Attachment

How teachers create lab practicals with attached datasets, starter code, and execution metadata.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher Client
    participant GW as API Gateway (:4000)
    participant Prac as Practicals Service (:4070)
    participant File as File Service (:4040)
    participant PG as PostgreSQL
    participant S3 as S3 / MinIO Storage
    participant Redis as Redis Pub/Sub

    Teacher->>GW: POST /api/practicals { title, description, subject_id, environment: "cpp-gcc", metadata }
    GW->>Prac: Forward to POST /practicals
    Prac->>PG: INSERT INTO practicals (...) VALUES (...)
    PG-->>Prac: Return practical record (id: practicalId)
    Prac->>Redis: Publish to 'practicals.events' (practical.created)
    Prac-->>GW: Return 201 Created { practicalId, ... }
    GW-->>Teacher: 201 Created

    Note over Teacher,S3: Uploading Dataset / Manual for Practical
    Teacher->>GW: POST /api/practicals/:id/presign-attachment { fileName: "iris.csv", contentType: "text/csv" }
    GW->>Prac: Forward to POST /practicals/:id/presign-attachment
    Prac->>File: HTTP POST /files/presign { fileName, contentType, activityType: 'practical', activityId }
    File->>PG: INSERT INTO activity_attachments (...)
    File->>S3: Generate S3 Presigned PUT URL
    S3-->>File: Signed URL (expires in 15m)
    File-->>Prac: Return { url, file_key, id }
    Prac-->>GW: Return { url, file_key, id }
    GW-->>Teacher: 200 OK with Presigned URL
    Teacher->>S3: Direct PUT binary upload (iris.csv) to Presigned URL
    S3-->>Teacher: 200 OK Upload Successful
```

---

### Flow 3: Assessment Creation with Test Cases

How teachers set up timed coding exams with automated test cases.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher Client
    participant GW as API Gateway (:4000)
    participant Assess as Assessments Service (:4050)
    participant PG as PostgreSQL
    participant Redis as Redis Pub/Sub

    Teacher->>GW: POST /api/assessments { title, course_id, test_cases: [ { input, expected, points, hidden } ] }
    GW->>Assess: Forward to POST /assessments
    Assess->>PG: INSERT INTO assessments (...)
    Assess->>PG: INSERT INTO test_cases (assessment_id, name, input, expected_output, points)
    PG-->>Assess: Created assessment & test cases
    Assess->>Redis: Publish 'assessments.events' (assessment.created)
    Assess-->>GW: 201 Created
    GW-->>Teacher: 201 Created { assessmentId, ... }
```

---

### Flow 4: Sandboxed Code Execution ("Run Code" Sandbox)

When a student clicks **"Run"** in the Monaco editor to test code with standard input before submitting.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant GW as API Gateway (:4000)
    participant Runner as Execution Runner (:4030)
    participant Redis as Redis (job_queue)
    participant Worker as Runner Worker Loop
    participant Mongo as MongoDB
    participant Docker as Docker Engine Sandbox

    Student->>GW: POST /api/execution/execute { environment: "python-dl", code: "import torch...", stdin: "..." }
    GW->>Runner: Forward to POST /execute
    Runner->>Mongo: INSERT initial job record (status: "queued")
    
    alt Asynchronous Queue Execution (Default)
        Runner->>Redis: RPUSH 'job_queue' { jobId, environment, code, stdin }
        Runner-->>GW: 202 Accepted { jobId, status: "queued" }
        GW-->>Student: 202 Accepted { jobId }
        
        Worker->>Redis: BLPOP 'job_queue'
        Redis-->>Worker: Return job payload
        Worker->>Mongo: UPDATE job status = "running"
        Worker->>Worker: Create host workspace folder: ./jobs/<jobId>
        Worker->>Worker: Write source file (main.cpp / main.py / query.sql)
        Worker->>Docker: docker run --rm --network none --memory=2048m -v ./jobs/<jobId>:/workspace vpl-python-dl:1.0
        Docker->>Docker: Execute script inside container
        Docker-->>Worker: Stream stdout & stderr chunks
        Worker->>Mongo: Append logs in real-time
        Docker-->>Worker: Container exits (exitCode: 0, executionTimeMs: 420)
        Worker->>Worker: Scan workspace for generated artifacts (.png, .json)
        Worker->>Mongo: UPDATE job status = "completed", stdout, stderr, execution_time_ms
        Worker->>Redis: Publish 'execution.events' (execution.completed)
        
        Student->>GW: GET /api/execution/jobs/<jobId>
        GW->>Runner: GET /jobs/<jobId>
        Runner->>Mongo: Find job by _id
        Mongo-->>Runner: Return completed job doc
        Runner-->>GW: Return completed job doc with output
        GW-->>Student: 200 OK with stdout & stderr
    else Synchronous Execution (?sync=true)
        Runner->>Worker: Execute immediately in sandbox
        Worker->>Docker: Spawn container & wait
        Docker-->>Worker: Execution complete
        Worker-->>Runner: Return ExecutionResult
        Runner-->>GW: Return ExecutionResult
        GW-->>Student: 200 OK { status: "completed", stdout, stderr, exit_code }
    end
```

---

### Flow 5: Practical Lab Submission & Teacher Review

When a student clicks **"Submit"** on a regular practical assignment.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant GW as API Gateway (:4000)
    participant Sub as Submission Service (:4020)
    participant PG as PostgreSQL
    participant Redis as Redis Pub/Sub
    participant Runner as Execution Runner (:4030)
    participant Docker as Docker Container
    participant Mongo as MongoDB
    actor Teacher as Teacher Client

    Student->>GW: POST /api/submissions { practical_id, submitter_id, metadata: { code, language } }
    GW->>Sub: Forward to POST /submissions
    Sub->>Sub: Rate Limit check (max 10 req/min) & Anti-Spam check
    Sub->>PG: INSERT INTO submissions (student_id, practical_id, code, status: "submitted")
    PG-->>Sub: Return created submission (id: submissionId)
    Sub->>Redis: Publish to 'submissions.events' (submission.created)
    Sub-->>GW: Return 201 Created { submissionId }
    GW-->>Student: 201 Created { submissionId }

    Note over Redis,Runner: Background Container Execution for Submission
    Runner->>Redis: Message received on 'submissions.events'
    Runner->>Runner: Extract code, practical_id, environment
    Runner->>Mongo: Create execution_jobs record
    Runner->>Docker: Run code in isolated container
    Docker-->>Runner: Output captured
    Runner->>Mongo: Update job with stdout, stderr, exit code
    Runner->>Redis: Publish 'execution.events' (execution.completed)

    Note over Teacher,PG: Teacher Reviews Submission
    Teacher->>GW: GET /api/submissions?practicalId=<id>
    GW->>Sub: GET /submissions?practicalId=<id>
    Sub->>PG: SELECT * FROM submissions WHERE practical_id = <id>
    PG-->>Sub: Return list of student submissions + code
    Sub-->>GW: Return list of student submissions + code
    GW-->>Teacher: 200 OK (Teacher reviews code and assigns marks)
```

---

### Flow 6: Assessment Submission & Automated Auto-Grading

When a student submits code for an **Assessment**, triggering the automated test-case grading pipeline.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant GW as API Gateway (:4000)
    participant Sub as Submission Service (:4020)
    participant Redis as Redis Pub/Sub
    participant Runner as Execution Runner (:4030)
    participant Docker as Docker Sandbox
    participant Mongo as MongoDB
    participant Grader as Assessment Grader (Worker)
    participant Assess as Assessments Service (:4050)
    participant PG as PostgreSQL

    Student->>GW: POST /api/submissions { assessment_id, submitter_id, metadata: { code, language: "cpp" } }
    GW->>Sub: Forward to POST /submissions
    Sub->>PG: INSERT INTO submissions (assessment_id, submitter_id, code)
    PG-->>Sub: Created submission (id: subId)
    Sub->>Redis: Publish 'submissions.events' (type: "submission.created", data: { id: subId, assessment_id })
    Sub-->>GW: Return 201 Created { id: subId }
    GW-->>Student: 201 Created { id: subId }

    Note over Redis,Runner: 1. Execution Runner Runs Code
    Runner->>Redis: Consumes 'submission.created'
    Runner->>Docker: Run code in sandbox
    Docker-->>Runner: Execution complete (captures stdout/stderr)
    Runner->>Mongo: Save logs & output in execution_jobs (jobId: j1)
    Runner->>Redis: Publish 'execution.events' { type: "execution.completed", data: { jobId: j1, submission_id: subId } }

    Note over Redis,Grader: 2. Assessment Grader Calculates Score
    Grader->>Redis: Consumes 'execution.completed'
    Grader->>Mongo: Fetch execution logs for jobId j1
    Grader->>Sub: GET /submissions/:subId (Fetch submission metadata & assessment_id)
    Sub-->>Grader: Return submission details
    Grader->>Assess: GET /assessments/:assessmentId (Fetch test_cases with expected outputs & points)
    Assess-->>Grader: Return test_cases array
    Grader->>Grader: computeScoreFromLogs(test_cases, executionLogs)
    Grader->>PG: INSERT INTO assessment_submissions (submission_id, assessment_id, student_id, score, grading_details)
    PG-->>Grader: Saved grading record
    Grader->>Redis: Publish 'grading.events' { type: "grading.completed", data: { score, results } }
```

---

### Flow 7: File Upload & S3/MinIO Presigned URL Handling

How large assets (datasets, PDF manuals, notebook files) are securely uploaded directly to object storage without choking API servers.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Client / Teacher
    participant GW as API Gateway (:4000)
    participant File as File Service (:4040)
    participant PG as PostgreSQL
    participant S3 as S3 / MinIO Object Storage

    Client->>GW: POST /api/files/presign { fileName: "lab_manual.pdf", contentType: "application/pdf", activityType: "practical", activityId: "p1" }
    GW->>File: Forward to POST /files/presign
    File->>PG: INSERT INTO activity_attachments (file_key, file_name, content_type, activity_id)
    File->>S3: Request presigned PUT URL via S3 SDK
    S3-->>File: Signed PUT URL with 15-minute expiration
    File-->>GW: Return { id, file_key, url }
    GW-->>Client: 200 OK { id, file_key, url }
    
    Note over Client,S3: Direct Binary Upload to Storage
    Client->>S3: Direct HTTP PUT <binary file data> to Presigned URL
    S3-->>Client: 200 OK (File stored directly in S3 bucket 'practical-files')
```

---

## 5. Data Store Ownership & Event Routing

### Datastore Separation Principles
1. **PostgreSQL (Source of Truth)**:
   - Owns all relational models: Users, Roles, Institutions, Practicals, Assessments, Test Cases, Submissions, Assessment Submissions, File Metadata.
   - Enforces referential integrity, foreign key cascades, and ACID transactions.
2. **MongoDB (Append-Heavy Execution Logs)**:
   - Owns the `execution_jobs` collection.
   - Stores raw container stdout, stderr, execution traces, and millisecond timing metrics.
3. **Redis (Queuing, Caching, and Real-Time Events)**:
   - **Queue (`job_queue`)**: FIFO execution queue consumed by `execution-runner`.
   - **Rate Limiting (`rl:<ip>`)**: Sliding window counters per client IP.
   - **Pub/Sub Channels**: Inter-service broadcast for decoupled reaction pipelines.
4. **S3 / MinIO (Binary Objects)**:
   - Stores large blobs (CSVs, datasets, PDF manuals, serialized models `.pt`/`.h5`, student notebook templates).

---

## 6. Docker Sandbox Security & Execution Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Docker Execution Engine                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Security Flags: --network none (Zero outbound network access)            │
│  • Memory Ceilings: --memory=512m (C++/SQL) to --memory=2048m (Python/DL)   │
│  • CPU Limits: --cpus=1.0 to --cpus=2.0                                     │
│  • Ephemeral Lifecycle: Created on demand, auto-destroyed (--rm) on exit    │
│  • Watchdog: Host-side process watchdog kills container if timeout exceeds  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The 3 Consolidated Runtime Images:

1. **`vpl-cpp-runner:1.0` (Slug: `cpp-gcc`)**:
   - **Covered Subjects**: DSA (C++), OOP, OS
   - **Runtime**: Debian Bookworm, GCC 13, G++, Make, POSIX Threads, Coreutils.
2. **`vpl-python-dl:1.0` (Slug: `python-dl`)**:
   - **Covered Subjects**: DSA (Python), ML, DL, DS
   - **Runtime**: Python 3.11, PyTorch (`torch`, `torchvision`), Scikit-Learn, Pandas, NumPy, Matplotlib, Seaborn, SciPy, Jupyter Nbconvert.
3. **`vpl-postgres-runner:1.0` (Slug: `postgres-dbms`)**:
   - **Covered Subjects**: DBMS
   - **Runtime**: PostgreSQL 16, `psql`, Python 3 + `psycopg2` query sidecar delivering JSON result grids.
