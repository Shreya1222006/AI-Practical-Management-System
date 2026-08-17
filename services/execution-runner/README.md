# Execution Runner Service (Node.js & TypeScript)

The **Execution Runner Service** is the sandboxed code execution engine of the Virtual Practical Laboratory platform. It orchestrates Docker-isolated runtime sandboxes across **3 consolidated environments** covering all required university lab subjects.

---

## 1. Supported Environments (Consolidated into 3 Images)

| # | Environment Slug | Image Tag | Target Subjects | Included Stack & Tools |
|---|---|---|---|---|
| 1 | **`cpp-gcc`** | `vpl-cpp-runner:1.0` | **DSA (C++), OOP, OS** | GCC 13, G++, `make`, `pthread`, `bash`, `coreutils` |
| 2 | **`python-dl`** | `vpl-python-dl:1.0` | **DSA (Python), ML, DL, DS** | Python 3.11, PyTorch (`torch`, `torchvision`), NumPy, Pandas, scikit-learn, Matplotlib, Seaborn, SciPy, Jupyter runner |
| 3 | **`postgres-dbms`** | `vpl-postgres-runner:1.0` | **DBMS** | PostgreSQL 16 server/client, `psql`, Python 3 + psycopg2 query executor with JSON grid output |

---

## 2. Architecture & Flow

```
┌───────────────┐        ┌────────────────────────┐        ┌─────────────┐
│  Web Client   ├───────►│  Execution Runner API  ├───────►│ Redis Queue │
│ (Monaco/Run)  │        │   (Express / Node.js)  │        │ (job_queue) │
└───────▲───────┘        └───────────┬────────────┘        └──────┬──────┘
        │                            │                            │
        │ Poll / WebSockets          ▼                            ▼
        │                    ┌───────────────┐             ┌─────────────┐
        └────────────────────┤    MongoDB    │◄────────────┤ Node Worker │
                             │ (Job / Logs)  │             │   Runner    │
                             └───────────────┘             └──────┬──────┘
                                                                  │
                                            ┌─────────────────────▼────────────────────┐
                                            │      Docker Isolated Sandbox             │
                                            │   --network none --memory --cpus         │
                                            │  (cpp-runner / python-dl / postgres)     │
                                            └──────────────────────────────────────────┘
```

1. **API Server (`POST /execute`)**: Receives execution request (`code`, `language`/`environment`, `stdin`, `time_limit_sec`), assigns `jobId`, creates initial doc in MongoDB, and enqueues to Redis `job_queue`.
2. **Worker Pool**: Consumes job from Redis using `BLPOP`, creates isolated workspace folder, mounts into Docker container, and enforces resource constraints (`--network none`, memory & CPU limits).
3. **Execution**: Compiles/runs code, captures `stdout`, `stderr`, `exit_code`, and execution time.
4. **Artifacts & Output**: Gathers generated plots (`.png`), exported models (`.pt`, `.h5`), or structured SQL grids (`execution_result.json`).
5. **Persistence & Events**: Updates MongoDB status to `completed` or `failed` and emits `execution.completed` on Redis `execution.events` channel.

---

## 3. REST Endpoints

### 3.1 Execute Code
- **Method:** `POST /execute` (or `POST /run`)
- **Query Params:** `?sync=true` (optional, waits and returns execution result directly)
- **Request Body:**
```json
{
  "environment": "cpp-gcc",
  "code": "#include <iostream>\nint main() { std::cout << \"Hello VPL!\\n\"; return 0; }",
  "time_limit_sec": 30,
  "memory_mb": 512
}
```
- **Async Response (HTTP 202):**
```json
{
  "job_id": "8f7c6e1a-...",
  "status": "queued",
  "environment": "cpp-gcc",
  "image": "vpl-cpp-runner:1.0",
  "message": "Job queued in Redis job_queue"
}
```

### 3.2 Deep Learning / Python Example
```json
{
  "environment": "python-dl",
  "code": "import torch\nprint('CUDA Available:', torch.cuda.is_available())\nx = torch.randn(2, 3)\nprint('Tensor shape:', x.shape)\nprint('Tensor device:', x.device)",
  "time_limit_sec": 60,
  "memory_mb": 2048
}
```

### 3.3 DBMS / PostgreSQL Query Example
```json
{
  "environment": "postgres-dbms",
  "code": "CREATE TABLE students (id SERIAL PRIMARY KEY, name VARCHAR(50), marks INT);\nINSERT INTO students (name, marks) VALUES ('Alice', 95), ('Bob', 88);\nSELECT * FROM students WHERE marks > 90;",
  "time_limit_sec": 60,
  "memory_mb": 1024
}
```

### 3.4 Get Job Status
- **Method:** `GET /jobs/:jobId` (or `GET /status/:jobId`)
- **Response:**
```json
{
  "job_id": "8f7c6e1a-...",
  "status": "completed",
  "environment": "cpp-gcc",
  "stdout": "Hello VPL!\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 340,
  "artifacts": []
}
```

### 3.5 List Environments
- **Method:** `GET /environments`

### 3.6 Health Check
- **Method:** `GET /health`

---

## 4. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4030` | HTTP Server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection for queue and pub/sub |
| `MONGO_URI` | `mongodb://localhost:27017/vpl_logs` | MongoDB connection for execution jobs and logs |
| `IMAGE_CPP` | `vpl-cpp-runner:1.0` | C/C++ Docker image tag |
| `IMAGE_PYTHON_DL` | `vpl-python-dl:1.0` | Python/ML/DL Docker image tag |
| `IMAGE_POSTGRES` | `vpl-postgres-runner:1.0` | PostgreSQL DBMS Docker image tag |

---

## 5. Building the 3 Docker Environment Images

```bash
# 1. Build C/C++ runner
docker build -t vpl-cpp-runner:1.0 docker/cpp-runner

# 2. Build Python & Deep Learning stack
docker build -t vpl-python-dl:1.0 docker/python-dl

# 3. Build PostgreSQL DBMS runner
docker build -t vpl-postgres-runner:1.0 docker/postgres-runner
```

---

## 6. Running the Service Locally

```bash
cd services/execution-runner
npm install
npm run build
npm run dev
```
