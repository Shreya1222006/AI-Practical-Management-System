# API Gateway

Consolidates routes and proxies requests to backend services, enforces auth via `auth-service`, adds rate-limiting, CORS and request tracing headers.

Env vars
- `AUTH_SERVICE_URL` (optional) - used to introspect tokens via `/me` or `/introspect`
- `PRACTICALS_SERVICE_URL`, `ASSESSMENTS_SERVICE_URL`, `SUBMISSION_SERVICE_URL`, `FILE_SERVICE_URL`, `USER_SERVICE_URL`
- `REDIS_URL` (optional) - for distributed rate limiting
- `PORT` - port to listen on (default 3000)

Run locally
```bash
cd services/api-gateway
npm install
npm run dev
```
# API Gateway

Minimal API Gateway scaffold. Responsibilities:

- JWT verification and auth forwarding (short-circuit in this scaffold)
- Route composition for UI (BFF) and proxy to backend services
- Rate limiting and request aggregation

Local dev: run with `npm run dev` after installing dependencies.
