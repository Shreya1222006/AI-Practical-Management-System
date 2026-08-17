# Virtual Practical Laboratory — Postman API Testing Guide & Execution Plan

This guide provides a complete, step-by-step testing plan for all microservices in the platform. You can test each service either directly via its dedicated port or through the central **API Gateway** (`http://localhost:4000`).

---

## Quick Reference: Service Ports & Base URLs

| Service | Direct Port & URL | Gateway Proxied Route | Description |
|---|---|---|---|
| **API Gateway** | `http://localhost:4000` | — | Central entry point, auth verification & rate limiting |
| **Auth Service** | `http://localhost:4010` | `http://localhost:4000/api/auth` | User registration, login, JWT issuance |
| **User Service** | `http://localhost:4060` | `http://localhost:4000/api/users` | Profile management & user listings |
| **Practicals Service** | `http://localhost:4070` | `http://localhost:4000/api/practicals` | Practical assignments & starter code |
| **Assessments Service** | `http://localhost:4050` | `http://localhost:4000/api/assessments` | Timed coding assessments & test cases |
| **Execution Runner** | `http://localhost:4030` | `http://localhost:4000/api/execution` | Docker sandboxed execution for C++, Python/DL, and SQL |
| **Submission Service** | `http://localhost:4020` | `http://localhost:4000/api/submissions` | Records student run attempts and final submissions |
| **File Service** | `http://localhost:4040` | `http://localhost:4000/api/files` | S3 / MinIO presigned upload & download URLs |

---

## Recommended Postman Setup

### Environment Variables
Set up the following variables in your Postman Environment:
- `baseUrl`: `http://localhost:4000` (or test services directly using their respective ports)
- `token`: *(Leave empty — populated after login)*
- `userId`: *(Leave empty — populated after registration/login)*
- `practicalId`: *(Leave empty — populated after creating a practical)*
- `assessmentId`: *(Leave empty — populated after creating an assessment)*
- `jobId`: *(Leave empty — populated after triggering execution)*

### Global Headers
For all authenticated requests:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

---

## Step-by-Step Testing Plan

```
Step 1: Auth (Register/Login) ──► Step 2: Users ──► Step 3: Practicals ──► Step 4: Assessments
                                                                                  │
Step 7: Check Grader Output  ◄── Step 6: Submissions ◄── Step 5: Execution Sandbox ◄┘
```

---

### Step 1: Authentication & Identity (`auth-service`)

#### 1.1 Register New User
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/auth/register` (Direct: `http://localhost:4010/auth/register`)
- **Description:** Creates a new user account with a hashed password in PostgreSQL and returns an initial JWT authentication token.
- **Request Body:**
```json
{
  "email": "student@vpl.edu",
  "password": "Password@123",
  "name": "John Doe"
}
```
- **Expected Response (201 Created):**
```json
{
  "user": {
    "id": "7b8f9e2a-1c3d-4e5f-a6b7-c8d9e0f1a2b3",
    "email": "student@vpl.edu",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> **Action:** Copy the `token` value into your Postman `{{token}}` variable and `user.id` into `{{userId}}`.

---

#### 1.2 User Login
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/auth/login` (Direct: `http://localhost:4010/auth/login`)
- **Description:** Verifies user credentials using bcrypt and returns a signed access token.
- **Request Body:**
```json
{
  "email": "student@vpl.edu",
  "password": "Password@123"
}
```
- **Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "7b8f9e2a-1c3d-4e5f-a6b7-c8d9e0f1a2b3",
    "email": "student@vpl.edu",
    "name": "John Doe"
  }
}
```

---

#### 1.3 Get Current Authenticated User (`/me`)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/auth/me` (Direct: `http://localhost:4010/auth/me`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Introspects and validates the current JWT token, returning the user's profile details and role.
- **Expected Response (200 OK):**
```json
{
  "id": "7b8f9e2a-1c3d-4e5f-a6b7-c8d9e0f1a2b3",
  "email": "student@vpl.edu",
  "name": "John Doe",
  "role": "student"
}
```

---

### Step 2: User Profile Management (`user-service`)

#### 2.1 List Users
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/users` (Direct: `http://localhost:4060/users`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Retrieves all registered users in the institution with pagination and role filters.
- **Expected Response (200 OK):**
```json
[
  {
    "id": "7b8f9e2a-1c3d-4e5f-a6b7-c8d9e0f1a2b3",
    "email": "student@vpl.edu",
    "name": "John Doe",
    "role": "student"
  }
]
```

---

#### 2.2 Get User by ID
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/users/{{userId}}` (Direct: `http://localhost:4060/users/{{userId}}`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Retrieves detailed profile information for a specific user ID.

---

### Step 3: Practicals Management (`practicals-service`)

#### 3.1 Create a Practical
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/practicals` (Direct: `http://localhost:4070/practicals`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Creates a new practical assignment with starter code, target environment slug, and metadata.
- **Request Body (C++ Practical Example):**
```json
{
  "title": "DSA Practical 1 - Binary Search Tree Operations",
  "description": "Implement insertion, deletion, and inorder traversal of a Binary Search Tree in C++.",
  "subject_id": "dsa-sub-001",
  "institution_id": "inst-pune-01",
  "environment": "cpp-gcc",
  "max_marks": 25,
  "language": "cpp",
  "metadata": {
    "sample_input": "5\n10 5 15 2 7",
    "expected_output": "2 5 7 10 15",
    "time_limit_sec": 30
  }
}
```
- **Expected Response (201 Created):**
```json
{
  "id": "practical-dsa-101",
  "title": "DSA Practical 1 - Binary Search Tree Operations",
  "subject_id": "dsa-sub-001",
  "max_marks": 25,
  "created_at": "2026-08-17T14:40:00.000Z"
}
```
> **Action:** Copy `id` into `{{practicalId}}`.

---

#### 3.2 List All Practicals
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/practicals` (Direct: `http://localhost:4070/practicals`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Lists all available practical assignments.

---

#### 3.3 Get Practical by ID
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/practicals/{{practicalId}}` (Direct: `http://localhost:4070/practicals/{{practicalId}}`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Fetches complete practical details, instructions, starter code, and attachment references.

---

### Step 4: Assessments & Test Cases (`assessments-service`)

#### 4.1 Create Assessment with Automated Test Cases
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/assessments` (Direct: `http://localhost:4050/assessments`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Creates a timed exam-style assessment with visible and hidden test cases for auto-grading.
- **Request Body:**
```json
{
  "title": "DSA Coding Assessment - Two Sum Problem",
  "course_id": "dsa-course-2026",
  "description": "Find indices of two numbers in an array that add up to a target sum.",
  "metadata": {
    "time_limit_sec": 30,
    "memory_mb": 512
  },
  "test_cases": [
    {
      "name": "Sample Case 1",
      "input": "4\n2 7 11 15\n9",
      "expected": "0 1",
      "points": 5,
      "hidden": false
    },
    {
      "name": "Hidden Case 2 - Duplicates",
      "input": "4\n3 2 4 3\n6",
      "expected": "1 2",
      "points": 5,
      "hidden": true
    }
  ]
}
```
- **Expected Response (201 Created):**
```json
{
  "id": "assessment-two-sum-01",
  "title": "DSA Coding Assessment - Two Sum Problem",
  "course_id": "dsa-course-2026"
}
```
> **Action:** Copy `id` into `{{assessmentId}}`.

---

#### 4.2 List Assessments by Course
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/assessments?course_id=dsa-course-2026` (Direct: `http://localhost:4050/assessments`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Retrieves all assessments belonging to a specific course.

---

### Step 5: File Service & Presigned URLs (`file-service`)

#### 5.1 Generate S3 / MinIO Presigned Upload URL
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/files/presign` (Direct: `http://localhost:4040/files/presign`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Requests a secure, time-limited presigned URL from S3/MinIO to directly upload datasets, manuals, or notebook templates.
- **Request Body:**
```json
{
  "fileName": "iris_dataset.csv",
  "contentType": "text/csv",
  "activityType": "practical",
  "activityId": "{{practicalId}}",
  "uploadedBy": "{{userId}}",
  "fileSize": 4520
}
```
- **Expected Response (200 OK):**
```json
{
  "id": "file-uuid-12345",
  "file_key": "practicals/practical-dsa-101/iris_dataset.csv",
  "url": "https://storage.supabase.co/.../iris_dataset.csv?token=...",
  "expires_in": 900
}
```

---

### Step 6: Sandboxed Code Execution (`execution-runner`)

The execution service supports **3 consolidated environments**:
1. `cpp-gcc` (DSA, OOP, OS)
2. `python-dl` (DSA Python, ML, Deep Learning, Data Science)
3. `postgres-dbms` (DBMS SQL Queries)

---

#### 6.1 Check Available Environments
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/execution/environments` (Direct: `http://localhost:4030/environments`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Lists all 3 supported Docker execution sandboxes with their installed tools and resource defaults.

---

#### 6.2 Execute C++ Practical Code (Asynchronous via Redis Queue)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/execution/execute` (Direct: `http://localhost:4030/execute`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Enqueues C++ compilation & execution into Redis `job_queue`. Returns immediately with a `job_id`.
- **Request Body:**
```json
{
  "environment": "cpp-gcc",
  "code": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << \"Sum: \" << (a + b) << endl;\n    } else {\n        cout << \"Hello from C++ Sandbox!\" << endl;\n    }\n    return 0;\n}",
  "stdin": "15 25",
  "time_limit_sec": 30,
  "memory_mb": 512,
  "practical_id": "{{practicalId}}",
  "submitter_id": "{{userId}}"
}
```
- **Expected Response (202 Accepted):**
```json
{
  "job_id": "c7a1e8d4-5b2f-4a90-8e1c-3b4d5e6f7a8b",
  "status": "queued",
  "environment": "cpp-gcc",
  "image": "vpl-cpp-runner:1.0",
  "message": "Job queued in Redis job_queue"
}
```
> **Action:** Copy `job_id` into `{{jobId}}`.

---

#### 6.3 Execute Python / Deep Learning Code (Synchronous Mode)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/execution/execute?sync=true` (Direct: `http://localhost:4030/execute?sync=true`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Executes Python ML/DL code in the `vpl-python-dl:1.0` container with PyTorch, Scikit-Learn, and Pandas, waiting for completion before responding.
- **Request Body:**
```json
{
  "environment": "python-dl",
  "code": "import torch\nimport numpy as np\nprint('PyTorch Version:', torch.__version__)\nprint('CUDA Available:', torch.cuda.is_available())\nt = torch.tensor([1.0, 2.0, 3.0])\nprint('Mean Tensor Value:', t.mean().item())",
  "time_limit_sec": 60,
  "memory_mb": 2048
}
```
- **Expected Response (200 OK):**
```json
{
  "jobId": "f2e4d6a8-1b3c-4d5e-9f0a-7b8c9d0e1f2a",
  "status": "completed",
  "environment": "python-dl",
  "stdout": "PyTorch Version: 2.2.0\nCUDA Available: False\nMean Tensor Value: 2.0\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 420,
  "artifacts": []
}
```

---

#### 6.4 Execute PostgreSQL DBMS Queries (Synchronous Mode)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/execution/execute?sync=true` (Direct: `http://localhost:4030/execute?sync=true`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Runs SQL DDL/DML statements inside the `vpl-postgres-runner:1.0` container and returns formatted tabular ASCII results and structured JSON result grids.
- **Request Body:**
```json
{
  "environment": "postgres-dbms",
  "code": "CREATE TABLE employees (id SERIAL PRIMARY KEY, name VARCHAR(50), dept VARCHAR(50), salary INT);\nINSERT INTO employees (name, dept, salary) VALUES ('Alice', 'AI/ML', 95000), ('Bob', 'Systems', 82000);\nSELECT name, dept, salary FROM employees WHERE salary > 85000;",
  "time_limit_sec": 60,
  "memory_mb": 1024
}
```
- **Expected Response (200 OK):**
```json
{
  "jobId": "9b8a7c6d-5e4f-3a2b-1c0d-e1f2a3b4c5d6",
  "status": "completed",
  "environment": "postgres-dbms",
  "stdout": "\nQuery: SELECT name, dept, salary FROM employees WHERE salary > 85000\nname  | dept  | salary\n------+-------+-------\nAlice | AI/ML | 95000 \n(1 rows)\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 680
}
```

---

#### 6.5 Poll Job Status & Logs
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/execution/jobs/{{jobId}}` (Direct: `http://localhost:4030/jobs/{{jobId}}`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Fetches current job execution state (`queued` $\to$ `running` $\to$ `completed` / `failed`), execution output, and raw logs from MongoDB.
- **Expected Response (200 OK):**
```json
{
  "job_id": "{{jobId}}",
  "status": "completed",
  "environment": "cpp-gcc",
  "image": "vpl-cpp-runner:1.0",
  "stdout": "Sum: 40\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 310,
  "output": {
    "stdout": "Sum: 40\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 310
  },
  "artifacts": []
}
```

---

### Step 7: Submissions & Auto-Grading Flow (`submission-service` & `assessment-grader`)

#### 7.1 Submit Practical Lab Work
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/submissions` (Direct: `http://localhost:4020/submissions`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Saves student code submission snapshot in PostgreSQL, creates an execution event, and triggers background container execution.
- **Request Body:**
```json
{
  "submitter_id": "{{userId}}",
  "practical_id": "{{practicalId}}",
  "metadata": {
    "language": "cpp",
    "environment": "cpp-gcc",
    "code": "#include <iostream>\nusing namespace std;\nint main() { cout << \"2 5 7 10 15\" << endl; return 0; }",
    "time_limit_sec": 30
  }
}
```
- **Expected Response (201 Created):**
```json
{
  "id": "sub-practical-901",
  "submitter_id": "{{userId}}",
  "practical_id": "{{practicalId}}",
  "created_at": "2026-08-17T14:45:00.000Z"
}
```

---

#### 7.2 Submit Assessment Solution (Triggers Auto-Grader)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/submissions` (Direct: `http://localhost:4020/submissions`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Submits student code against an assessment. Emits `submission.created` on Redis, which triggers execution runner followed by automated test-case scoring in `assessment-grader`.
- **Request Body:**
```json
{
  "submitter_id": "{{userId}}",
  "assessment_id": "{{assessmentId}}",
  "metadata": {
    "language": "cpp",
    "environment": "cpp-gcc",
    "code": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\nint main() {\n    int n, target;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    cin >> target;\n    unordered_map<int, int> seen;\n    for (int i = 0; i < n; i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) {\n            cout << seen[complement] << \" \" << i << endl;\n            return 0;\n        }\n        seen[nums[i]] = i;\n    }\n    return 0;\n}"
  }
}
```
- **Expected Response (201 Created):**
```json
{
  "id": "sub-assess-801",
  "submitter_id": "{{userId}}",
  "assessment_id": "{{assessmentId}}",
  "created_at": "2026-08-17T14:46:00.000Z"
}
```

---

#### 7.3 List Submissions by Submitter
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/submissions?submitter_id={{userId}}` (Direct: `http://localhost:4020/submissions?submitter_id={{userId}}`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Lists all historical practical and assessment submission records for the student.

---

#### 7.4 Get Submission Detail
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/submissions/sub-assess-801` (Direct: `http://localhost:4020/submissions/sub-assess-801`)
- **Headers:** `Authorization: Bearer {{token}}`
- **Description:** Retrieves the submitted code, execution logs, and teacher/auto-grader marks.

---

### Step 8: Health Checks & Service Diagnostics

You can verify that all individual backend services and the gateway are healthy:

| Service | Health Check Endpoint | Expected Status |
|---|---|---|
| **API Gateway** | `GET http://localhost:4000/health` | `{"status": "ok", "gateway": "api-gateway"}` |
| **Auth Service** | `GET http://localhost:4010/health` | `{"status": "ok"}` |
| **User Service** | `GET http://localhost:4060/health` | `{"status": "ok"}` |
| **Practicals Service** | `GET http://localhost:4070/health` | `{"status": "ok"}` |
| **Assessments Service** | `GET http://localhost:4050/health` | `{"status": "ok", "service": "assessments-service"}` |
| **Execution Runner** | `GET http://localhost:4030/health` | `{"status": "ok", "service": "execution-runner", "environments": ["cpp-gcc", "python-dl", "postgres-dbms"]}` |
| **File Service** | `GET http://localhost:4040/health` | `{"status": "ok"}` |

---

## Troubleshooting Common Issues

1. **`401 Unauthorized`**:
   - Ensure you included the `Authorization: Bearer {{token}}` header.
   - Run Step 1.2 (`/api/auth/login`) again if the token expired.

2. **`502 Bad Gateway` from API Gateway (`:4000`)**:
   - Verify that the target downstream microservice (e.g. `auth-service` on port 4010 or `execution-runner` on port 4030) is running.

3. **`Docker execution failed`**:
   - Make sure Docker Desktop or the Docker daemon is running locally.
   - Verify that execution images are built (`docker build -t vpl-cpp-runner:1.0 docker/cpp-runner`, etc.).
