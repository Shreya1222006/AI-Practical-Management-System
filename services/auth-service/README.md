# auth-service

Basic authentication service: register/login and JWT issuance.

Database setup (Postgres): apply the root schema and batch/user migration. Users derive their institution through `batch_id -> batches.institution_id`. Student accounts require a batch; staff accounts may omit one.

Endpoints:
- `POST /auth/register` { email, password, name, batch_id }
- `POST /auth/login` { email, password }
- `GET /auth/me` (Authorization: Bearer <token>)

Env vars used: `POSTGRES_*`, `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`, `BCRYPT_SALT_ROUNDS`, `PORT_AUTH_SERVICE`
# Auth Service

Simple scaffold for authentication service. Implements login/refresh and issues JWTs.

Local dev: `npm run dev`.
