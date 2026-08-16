# auth-service

Basic authentication service: register/login and JWT issuance.

Database setup (Postgres):

Run the following to create the `users` table:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Endpoints:
- `POST /auth/register` { email, password, name }
- `POST /auth/login` { email, password }
- `GET /auth/me` (Authorization: Bearer <token>)

Env vars used: `POSTGRES_*`, `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`, `BCRYPT_SALT_ROUNDS`, `PORT_AUTH_SERVICE`
# Auth Service

Simple scaffold for authentication service. Implements login/refresh and issues JWTs.

Local dev: `npm run dev`.
