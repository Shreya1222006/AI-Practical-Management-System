# AI-Powered Virtual Practical Laboratory System

A web-based platform for managing computer engineering practicals. Teachers upload lab assignments; students write code in a browser editor; submissions run in isolated Docker containers; teachers review code and execution output to assign marks. When teachers conduct formal evaluations, they create **Assessments** with LeetCode-style test-case auto-grading.

> **Current scope:** Base model using the **MERN stack** (MongoDB, Express, React, Node.js) with role-based access, Docker-based code execution, and submission management.  
> **Out of scope (Phase 2):** AI features — chatbot, RAG, vector search, and AI-assisted evaluation.

---

## Table of Contents

- [Overview](#overview)
- [User Roles & Permissions](#user-roles--permissions)
- [Supported Subjects & Execution Environments](#supported-subjects--execution-environments)
- [Practical vs Assessment](#practical-vs-assessment)
- [Evaluation Guide](./evaluation.md)
- [Entity & Database Schema](./entities.md)
- [Execution Environments](./execution.md)
- [System Architecture](#system-architecture)
- [Core Features (Base Model)](#core-features-base-model)
- [Key Workflows](#key-workflows)
- [Tech Stack](#tech-stack)
- [Data & Storage](#data--storage)
- [Security & Resource Limits](#security--resource-limits)
- [Infrastructure & DevOps](#infrastructure--devops)
- [Project Structure (Planned)](#project-structure-planned)
- [API Overview (Planned)](#api-overview-planned)
- [Development Roadmap](#development-roadmap)
- [Getting Started](#getting-started)

---

## Overview

This system replaces traditional lab setups with a centralized, browser-accessible platform where:

1. **Teachers** upload **Practicals** for subjects like DSA, OOP, OS, DBMS, ML, and DL — problem descriptions, reference materials, and Docker environment config.
2. **Students** write code in an integrated editor, **Run** to execute in a sandbox, and **Submit** to save code + execution output for teacher review.
3. **Teachers** optionally create **Assessments** — timed, test-case-based evaluations (LeetCode-style) with auto-grading.
4. **The platform** executes all code in **sandboxed Docker containers**, stores every submission, and gives teachers full visibility for marking.

The base model prioritizes **accountability** (every run and submission is logged), **isolation** (no student code runs on the host), and **subject-appropriate environments** (compiler vs. database vs. notebook).

---

## User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Student** | View practicals & assessments, run code in sandbox, submit work, view own submission history and marks |
| **Teacher** | Create practicals & assessments, assign to batches, view all submissions (code + output), assign marks, export reports |
| **Admin** | Manage users and roles, manage subjects and system settings, monitor platform usage, generate institution-wide reports |

### Role-Based Access Control (RBAC)

- Authentication via **JWT** (access + refresh tokens).
- Permissions enforced at API middleware and UI route level.
- Teachers scoped to their subjects/batches; students scoped to enrolled courses.
- Admin has global access with audit logging for sensitive actions.

---

## Supported Subjects & Execution Environments

Each subject maps to a **reference Docker environment** provisioned on demand when a student clicks **Run** or **Submit**.

| Subject | Topics | Environment Slug | Docker Image | Notes |
|---------|--------|------------------|--------------|-------|
| **DSA** | Arrays, trees, graphs, sorting | `cpp-gcc` / `python-dl` | `vpl-cpp-runner:1.0` / `vpl-python-dl:1.0` | C++ & Python practicals & test-case grading |
| **OOP** | Classes, inheritance, polymorphism | `cpp-gcc` | `vpl-cpp-runner:1.0` | C++ classes, operator overloading & design review |
| **OS** | Processes, scheduling, memory, threads | `cpp-gcc` | `vpl-cpp-runner:1.0` | POSIX threads & formatted output |
| **DBMS** | SQL queries, joins, DDL/DML, indexing | `postgres-dbms` | `vpl-postgres-runner:1.0` | PostgreSQL 16 + SQL runner returning JSON result grids |
| **ML** | Regression, classification, clustering | `python-dl` | `vpl-python-dl:1.0` | Python 3.11, Scikit-Learn, Pandas, Matplotlib, Seaborn |
| **DL** | Neural networks, CNNs, PyTorch | `python-dl` | `vpl-python-dl:1.0` | PyTorch, Torchvision, model training logs & plots |
| **DS** | Pandas, NumPy, statistical visualization | `python-dl` | `vpl-python-dl:1.0` | DataFrames, statistical summaries & plots |

### Environment provisioning rules

- One **short-lived container per execution** — created on run, destroyed after timeout or completion.
- **No outbound network** from student containers (prevents cheating and abuse).
- **Read-only** mount for problem datasets; **writable** `/tmp` or `/workspace` for student code only.
- Environment type is stored on each practical record and selected automatically by the execution orchestrator.

---

## Practical vs Assessment

The platform has **two activity types**. See [evaluation.md](./evaluation.md) for full details.

### Practical (default — all lab work)

Regular lab assignments for every subject. **No test-case auto-grading.**

| Action | Behavior |
|--------|----------|
| **Run** | Execute in Docker sandbox; show stdout/stderr, errors, runtime |
| **Submit** | Save code + execution output permanently |
| **Result display** | Code viewer + formatted execution output (console, tables, plots, SQL grids) |
| **Grading** | Teacher reviews code and output → assigns marks manually |

**Statuses:** `Submitted`, `Executed`, `Evaluated`, `Compilation Error`, `Runtime Error`, `Time Limit Exceeded`

### Assessment (teacher-initiated — exam-style)

Created when a teacher wants LeetCode-style evaluation with test cases. **Auto-graded.**

| Action | Behavior |
|--------|----------|
| **Run** | Execute against **sample** test cases; show pass/fail per case |
| **Submit** | Execute against **all** test cases (incl. hidden); compute score |
| **Result display** | Per-test-case pass/fail, expected vs actual output, aggregate score |
| **Grading** | Auto-score from test cases; teacher may override |

**Statuses:** `Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Runtime Error`, `Compilation Error`

### When to use which

| Use **Practical** | Use **Assessment** |
|-------------------|-------------------|
| All regular lab assignments (every subject) | DSA coding quizzes / exams |
| OOP, OS, DBMS, ML, DL, DS labs | Timed algorithm problems with exact I/O |
| Project-style or multi-file work | Practice problems with hidden test cases |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (Browser)                        │
│   React + TypeScript + Tailwind │ Monaco Editor │ Role Dashboards       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ REST + WebSocket
┌─────────────────────────────────▼───────────────────────────────────────┐
│                    API GATEWAY / BACKEND (Node.js + Express)            │
│         Auth (JWT) │ RBAC │ Rate Limiting │ WebSocket Hub               │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ User Service  │       │ Practical Service│       │ Submission Svc  │
│ Subject Svc   │       │ Evaluation Svc   │       │ File Service    │
│ Analytics Svc │       │ Notes Service    │       │ Execution Svc   │
└───────┬───────┘       └────────┬─────────┘       └────────┬────────┘
        │                        │                          │
        └────────────────────────┼──────────────────────────┘
                                 │
        ┌────────────────────────┼──────────────────────────┐
        ▼                        ▼                          ▼
┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  PostgreSQL   │       │     MongoDB     │       │  Redis + Queue  │
│  (primary)    │       │  (logs, exec)   │       │  (job queue)    │
└───────────────┘       └─────────────────┘       └────────┬────────┘
                                                           │
                                 ┌─────────────────────────▼──────────┐
                                 │     Execution Orchestrator           │
                                 │  (Docker Engine / optional K8s)      │
                                 └─────────────────────────┬────────────┘
                                                           │
              ┌────────────────┬───────────────┬───────────┴──────────┐
              ▼                ▼               ▼                      ▼
        ┌──────────┐    ┌────────────┐  ┌────────────┐        ┌────────────┐
        │ C++ Env  │    │ PostgreSQL │  │ Python/    │        │  MinIO /   │
        │ (DSA/OOP │    │  (DBMS)    │  │ Jupyter    │        │  S3        │
        │  /OS)    │    │            │  │ (ML/DL/DS) │        │ (files)    │
        └──────────┘    └────────────┘  └────────────┘        └────────────┘
```

### Layer summary

| Layer | Responsibility |
|-------|----------------|
| **Frontend** | Dashboards, practical view (code + output), assessment view (LeetCode-style), Monaco editor, run/submit UI |
| **Backend API** | REST endpoints, JWT auth, RBAC, orchestration of services |
| **Core services** | Modular business logic (users, practicals, submissions, evaluation, files, execution) |
| **Execution layer** | Queue-backed Docker runner with resource limits and log capture |
| **Data layer** | PostgreSQL (relational), MongoDB (logs/unstructured), Redis (cache + queue), object storage (files) |

---

## Core Features (Base Model)

Features included in the first release, plus components that are **required** but easy to overlook.

### 1. Authentication & user management

- Register/login (admin-created accounts or institutional SSO in later phase).
- JWT-based sessions with role claims.
- Profile management (name, roll number, batch, enrolled subjects).

### 2. Practical & assessment management (Teacher)

**Practicals** (regular labs):

- Create with title, description (Markdown), max marks, due date, environment type, starter code, attached files (PDF, datasets, schemas).
- Assign to batches/sections.

**Assessments** (test-case exams):

- Create with title, description, constraints, time/memory limits.
- Add **sample test cases** (visible) and **hidden test cases** (grading only).
- Assign to batches with deadline.

### 3. Student experience

**Practical:**

- Read problem & instructions → write code in **Monaco Editor** → **Run** (see output) → **Submit** (save code + output).
- View submission history with code diff between attempts.

**Assessment (LeetCode-style):**

- Read problem with sample test cases → write code → **Run** (sample tests) → **Submit** (all tests → auto score).
- View per-test-case results and score.

### 4. Code execution engine

- **Execution Orchestrator** runs code in Docker; behavior depends on activity type (practical = capture output; assessment = run test cases).
- **Redis Queue (Bull/BullMQ)** — prevents server overload when many students run code simultaneously; fair FIFO with priority for submits.
- Spins up **isolated Docker containers** per job.
- Captures: stdout, stderr, exit code, execution time, memory usage.
- Enforces timeouts and kills runaway processes.
- Stores execution logs in MongoDB for debugging.

### 5. Submission management & accountability

- Every **run** and **submit** recorded with: student ID, activity ID, activity type, code snapshot, timestamp, execution output.
- For **assessments**: also store per-test-case results and auto-score.
- Teachers see **all submissions** — code + output side-by-side (practicals) or test-case breakdown (assessments).
- Export submissions (CSV/JSON) for record-keeping.
- Version history — no submission is overwritten.

### 6. Evaluation (Teacher)

- **Practicals:** Teacher opens submission → reviews code + execution output → assigns marks and feedback.
- **Assessments:** Auto-score from test cases on submit; teacher may override marks or add feedback.

### 7. File & dataset management

- Upload/download via **MinIO** (local dev) or **AWS S3** (production).
- Stores: syllabus PDFs, practical manuals, datasets, notebook files, student-uploaded assets (where allowed).
- Pre-signed URLs for secure, time-limited access.

### 8. Real-time feedback (WebSockets)

- Live execution status: `Queued` → `Running` → `Completed` / `Failed`.
- Push results to client without polling.
- Optional: teacher dashboard live view of class activity during lab hours.

### 9. Notes service

- Students maintain per-practical notes (Markdown).
- Export notes as PDF for lab journals (requirement in many universities).

### 10. Analytics & reporting

- **Teacher:** class average, submission rate, common failure modes, score distribution.
- **Admin:** system usage, container utilization, active users, storage consumption.
- Charts on dashboards (submission trends, pass rates).

### 11. Notifications

- In-app notifications: practical assigned, deadline reminder, evaluation published.
- Email notifications (optional, via SMTP/SendGrid) — configurable per institution.

### 12. Audit & logging

- Structured application logs (Winston/Pino).
- Execution logs in MongoDB.
- Admin audit trail: user role changes, practical deletes, mark overrides.
- **ELK stack** (Elasticsearch, Logstash, Kibana) or lightweight alternative (Loki) for production log aggregation.

### 13. Monitoring (production)

- **Prometheus + Grafana** — API latency, queue depth, container spawn rate, error rates.
- Alerts when queue backlog or Docker daemon failures exceed thresholds.

---

## Key Workflows

### Student — Practical workflow

```
Login → Dashboard → Open Practical
    → Read Instructions → Write Code
    → Run → View Output
    → Submit → Code + Output Saved
    → Teacher Evaluates → View Marks
```

### Student — Assessment workflow

```
Login → Dashboard → Open Assessment
    → Read Problem & Sample Cases → Write Code
    → Run (sample tests) → View Pass/Fail
    → Submit (all tests) → View Score
```

### Teacher workflow

```
Create Practical OR Assessment → Assign to Batch
    → (Practical) Review code + output → Assign Marks
    → (Assessment) Review auto-scores → Override if needed
    → Publish Results → Export Report
```

### Internal execution flow

```
Student clicks RUN/SUBMIT
    → Backend validates auth & activity access
    → Job enqueued in Redis
    → Execution Orchestrator picks job
    → Select Docker image by environment type
    → Create container → Execute student code
    → if practical: capture stdout/stderr/artifacts → store
    → if assessment: run test cases → compare → store results + score
    → Destroy container → Push via WebSocket → Return to frontend
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Monaco Editor, React Router, TanStack Query |
| **Backend** | Node.js, Express.js, TypeScript |
| **Primary database** | PostgreSQL (users, subjects, practicals, submissions, evaluations, RBAC) |
| **Document store** | MongoDB (execution logs, unstructured metadata) |
| **Cache & queue** | Redis, BullMQ |
| **File storage** | MinIO (dev) / AWS S3 (prod) |
| **Real-time** | Socket.io (WebSockets) |
| **Code execution** | Docker (+ Kubernetes optional for scale) |
| **Auth** | JWT, bcrypt |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus, Grafana |
| **Logging** | Winston + ELK (or Loki/Grafana) |

> **Note on MERN:** The stack uses MongoDB alongside PostgreSQL. PostgreSQL holds structured relational data (users, marks, assignments); MongoDB holds high-volume execution logs. This hybrid approach is common for execution-heavy platforms.

---

## Data & Storage

> **Full schema:** See [entities.md](./entities.md) for all 24 PostgreSQL tables, MongoDB collections, Redis keys, and S3 layout.

### Summary

| Store | Role |
|-------|------|
| **PostgreSQL** | Users, RBAC, subjects, practicals, assessments, submissions, marks |
| **MongoDB** | Execution job logs (high volume) |
| **Redis** | Queues, rate limits, JWT blacklist, cache |
| **S3 / MinIO** | Datasets, PDFs, notebooks, plots |

**Schema update (2026-08-15):** Assessment auto-grade details were moved out of the mixed `submissions` table into a dedicated `assessment_submissions` table to separate concerns and improve query performance. Migration script: `migrations/20260815_separate_assessment_submissions.sql`. See [entities.md](./entities.md#L619) for details.

---

## Security & Resource Limits

### Container sandbox

| Resource | Limit |
|----------|-------|
| CPU | 1–2 cores |
| RAM | 512 MB – 2 GB (configurable per practical) |
| Execution time | 5–30 seconds (DSA/OOP/OS); up to 10 min (ML/DL notebooks) |
| Disk | 256 MB – 1 GB writable |
| Network | **Disabled** ( `--network=none` ) |
| Filesystem | Read-only problem files; no host mounts |

### Application security

- Input sanitization on all API payloads.
- Code size limits (max lines / max file size).
- Rate limiting on run/submit endpoints (e.g., 10 runs/minute/student).
- CORS restricted to frontend origin.
- Helmet.js security headers.
- Secrets via environment variables (never committed).
- Docker socket access restricted to execution service only.

---

## Infrastructure & DevOps

### Local development

- `docker-compose.yml` orchestrates: API, frontend, PostgreSQL, MongoDB, Redis, MinIO, and pre-built execution images.
- Hot reload for frontend and backend.

### Production (recommended)

- Containerized services behind reverse proxy (Nginx/Traefik).
- Optional **Kubernetes** for auto-scaling execution workers.
- Separate worker nodes for Docker execution (isolated from API servers).
- GitHub Actions pipeline: lint → test → build images → deploy.

### Docker images to maintain
 
> Component lists, versions, and phase plan: [execution.md](./mdFiles/execution.md)
 
| Image | Slug | Subjects Covered | Key Components |
|-------|------|------------------|----------------|
| `vpl-cpp-runner:1.0` | `cpp-gcc` | DSA (C++), OOP, OS | GCC/G++ 13, make, pthread, bash, coreutils |
| `vpl-python-dl:1.0` | `python-dl` | DSA (Python), ML, DL, DS | Python 3.11, PyTorch, Torchvision, Scikit-Learn, Pandas, NumPy, Matplotlib, Seaborn, SciPy, Jupyter |
| `vpl-postgres-runner:1.0` | `postgres-dbms` | DBMS | PostgreSQL 16, psql, Python 3, psycopg2, SQL runner |

---

## Project Structure (Planned)

```
AI-Practical-Management-System/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Editor, dashboards, practical view
│   │   ├── pages/          # Student, teacher, admin routes
│   │   ├── hooks/          # useAuth, useExecution, useWebSocket
│   │   └── services/       # API client
│   └── public/
├── server/                 # Express backend
│   ├── src/
│   │   ├── modules/        # user, subject, practical, assessment, submission, evaluation, execution, file, notes
│   │   ├── middleware/     # auth, rbac, rateLimit
│   │   ├── queues/         # BullMQ workers
│   │   ├── docker/         # container lifecycle, image registry
│   │   └── websocket/      # Socket.io handlers
│   └── tests/
├── docker/                 # Execution environment Dockerfiles
│   ├── cpp-runner/
│   ├── postgres-runner/
│   ├── python-runner/
│   └── jupyter-runner/
├── docker-compose.yml
├── .github/workflows/      # CI/CD
└── README.md
```

---

## API Overview (Planned)

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/register` | Register (admin-controlled) |
| POST | `/api/auth/refresh` | Refresh access token |

### Practicals & Assessments (Teacher)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/practicals` | Create practical |
| PUT | `/api/practicals/:id` | Update practical |
| POST | `/api/practicals/:id/assign` | Assign practical to batch |
| POST | `/api/assessments` | Create assessment |
| PUT | `/api/assessments/:id` | Update assessment |
| POST | `/api/assessments/:id/test-cases` | Add test cases |
| POST | `/api/assessments/:id/assign` | Assign assessment to batch |

### Execution (Student)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/execution/run` | Run code (output for practical; sample tests for assessment) |
| POST | `/api/execution/submit` | Submit (save output for practical; grade for assessment) |
| GET | `/api/execution/:jobId` | Poll job status (WebSocket preferred) |

### Submissions (Teacher)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/submissions?practicalId=` | List all submissions |
| GET | `/api/submissions/:id` | Submission detail + code |
| PUT | `/api/evaluations/:submissionId` | Manual score/feedback |

---

## Development Roadmap

### Phase 1 — Base model (current)

- [ ] Project scaffolding (monorepo: client + server)
- [ ] Auth & RBAC (Student, Teacher, Admin)
- [ ] Subject, practical & assessment CRUD
- [ ] Monaco editor integration
- [ ] Docker execution for C++ (DSA/OOP/OS)
- [ ] Practical flow: Run/Submit → code + output display → teacher review
- [ ] Assessment flow: Run/Submit → test-case auto-grading (LeetCode-style)
- [ ] Submission storage & teacher review
- [ ] PostgreSQL + MongoDB + Redis setup
- [ ] WebSocket execution feedback
- [ ] File upload (MinIO)
- [ ] Basic teacher analytics

### Phase 2 — Extended environments

- [ ] PostgreSQL/SQL execution environment (DBMS practicals)
- [ ] Python & Jupyter environments (ML, DL, DS practicals)
- [ ] Notebook submission support
- [ ] Email notifications
- [ ] Export reports (PDF/CSV)

### Phase 3 — Scale & polish

- [ ] Kubernetes execution workers
- [ ] Prometheus/Grafana monitoring
- [ ] ELK logging stack
- [ ] Plagiarism detection integration
- [ ] Institutional SSO (LDAP/OAuth)

### Phase 4 — AI features (future)

- [ ] AI chatbot for student queries
- [ ] RAG over syllabus and practical manuals
- [ ] AI-assisted hint generation
- [ ] Intelligent evaluation assistance
- [ ] Vector database (pgvector) for semantic search

---

## Getting Started

> Setup instructions will be added as the codebase is scaffolded.

### Prerequisites

- Node.js 20+
- Docker Desktop (with Docker Compose)
- PostgreSQL 16, MongoDB 7, Redis 7 (or use `docker-compose`)
- Git

### Planned quick start

```bash
# Clone the repository
git clone https://github.com/<org>/AI-Practical-Management-System.git
cd AI-Practical-Management-System

# Copy environment template
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Install dependencies & run (once scaffolded)
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

### Environment variables (planned)

```env
# Server
PORT=5000
JWT_SECRET=
JWT_REFRESH_SECRET=

# Databases
DATABASE_URL=postgresql://user:pass@localhost:5432/vpl
MONGODB_URI=mongodb://localhost:27017/vpl_logs
REDIS_URL=redis://localhost:6379

# Storage
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=vpl-files

# Docker
DOCKER_HOST=unix:///var/run/docker.sock
EXECUTION_TIMEOUT_MS=30000
```

---

## License

TBD

---

## Contributing

Contributions welcome once Phase 1 scaffolding is in place. Please open an issue before large changes.
