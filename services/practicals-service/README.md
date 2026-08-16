# practicals-service

CRUD service for practicals. Uses `practicals` table (see `entities.md`) and integrates with `file-service` for attachments.

Endpoints
- `POST /practicals` - create practical
- `GET /practicals` - list practicals
- `GET /practicals/:id` - get practical
- `PUT /practicals/:id` - update practical
- `POST /practicals/:id/presign-attachment` - get presigned upload URL via `file-service`

Env vars: `POSTGRES_*`, `FILE_SERVICE_URL` (optional), `REDIS_URL` (optional)

Run:
```bash
cd services/practicals-service
npm install
npm run dev
```
# Practicals Service

Manages practicals (lab assignments), metadata, and attachments. Responsible for:

- Creating/updating practicals and subject-specific `metadata` JSONB fields.
- Listing and retrieving practicals.
- Registering attachment metadata (files stored in object store via `file-service`).

Local dev: `npm run dev`.
