# user-service

Provides user profile endpoints and role management.

Ensure the same `users` table exists as used by `auth-service`.

Endpoints:
- `GET /users` - list users (limited)
- `GET /users/:id` - get user profile
- `PUT /users/:id` - update `name` or `role`

Env vars used: `POSTGRES_*`, `PORT_USER_SERVICE`
# User Service

Manages user profiles, roles, and enrollments. Exposes simple CRUD endpoints for other services.
