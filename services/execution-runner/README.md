# execution-runner

Consumes `submission.created` events, runs student code in sandboxed Docker containers, streams logs to MongoDB `execution_jobs` collection, and publishes `execution.completed` events.

Behavior
- Subscribes to Redis channel `submissions.events` and handles messages with `type: submission.created`.
- Creates an `execution_jobs` document in MongoDB with status updates and logs.
- Runs a Docker container (image selected via submission metadata or defaults) with resource limits and workspace mounted.
- Streams stdout/stderr to Mongo and updates job status on completion.
- Publishes `execution.completed` events to Redis channel `execution.events`.

Env vars
- `MONGO_URI` (required)
- `REDIS_URL` (required for pub/sub)
- `FILE_SERVICE_URL` (optional, to fetch attachments)
- `DEFAULT_ENVIRONMENT` (slug, e.g., `python-dsa`)

Run locally
```bash
cd services/execution-runner
npm install
npm run dev
```
# Execution Runner

Stateless worker/service that executes student code in containers. In local dev this scaffold exposes a `/run` endpoint that would normally be triggered by a queue consumer.
