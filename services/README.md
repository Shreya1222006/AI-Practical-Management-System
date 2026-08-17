# Microservices Catalog

The backend follows a microservice architecture built in **Node.js & TypeScript**.

| Service | Port | Description |
|---|---|---|
| **`api-gateway`** | `4000` | Central API Gateway, request proxying, authentication verification & rate limiting |
| **`auth-service`** | `4010` | User authentication, JWT issuance & refresh token lifecycle |
| **`user-service`** | `4060` | User profiles, student/teacher role management, batches & enrollments |
| **`practicals-service`** | `4070` | Practicals CRUD, syllabus attachments & batch assignments |
| **`assessments-service`** | `4050` | Timed coding assessments, test-case management & auto-grade setup |
| **`submission-service`** | `4020` | Ingests student runs and submissions, persists attempts & emits events |
| **`execution-runner`** | `4030` | Docker sandbox execution engine for C++, Python/Deep Learning, and PostgreSQL DBMS |
| **`assessment-grader`** | Worker | Consumes execution completed events, runs automated test-case scoring |
| **`file-service`** | `4040` | S3 / MinIO file uploads, downloads, and presigned URLs |

---

## Running Services Locally

Each service is an independent TypeScript application with its own `package.json`:

```bash
# Example: Running the API Gateway
cd services/api-gateway
npm install
npm run dev

# Example: Running the Execution Runner
cd services/execution-runner
npm install
npm run dev
```

Or run all infrastructure and containerized services using Docker Compose:

```bash
docker-compose up -d
```
