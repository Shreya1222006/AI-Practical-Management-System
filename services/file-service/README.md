# file-service

Provides presigned upload/download URLs and stores attachment metadata in Postgres. Integrates with MinIO/S3.

Endpoints
- `POST /files/presign` - body: `{ fileName, contentType, activityType, activityId, uploadedBy, fileSize }` → returns `uploadUrl` and stored `meta` row.
- `GET /files/meta/:id` - returns metadata for attachment id.
- `DELETE /files/:id` - deletes object from S3 and removes metadata row.

Env vars used (see `.env.example`): `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, Postgres `POSTGRES_*`.

DB table: uses `activity_attachments` defined in `entities.md` / migrations.
# File Service

Generates presigned URLs, handles file lifecycle and virus scanning hooks.
