import { Request, Response } from 'express';
import { getSignedUploadUrl, deleteObject } from '../utils/s3Client';
import { insertAttachment, findAttachmentById, removeAttachment } from '../models/attachmentRepo';

export async function presignUpload(req: Request, res: Response) {
  try {
    const { fileName, contentType, activityType, activityId, uploadedBy, fileSize } = req.body;
    if (!fileName || !contentType || !activityType || !activityId || !uploadedBy) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const key = `${activityType}/${activityId}/${Date.now()}_${fileName}`;
    const url = await getSignedUploadUrl(key, contentType);

    // store metadata pre-upload
    const meta = await insertAttachment({ activity_type: activityType, activity_id: activityId, file_key: key, file_name: fileName, file_size: fileSize || null, content_type: contentType, uploaded_by: uploadedBy });

    res.json({ uploadUrl: url, meta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

// Creates a presigned S3 upload URL for the client, records attachment metadata
// in the DB before upload, and returns the upload URL plus stored metadata.

export async function getMeta(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const meta = await findAttachmentById(id);
    if (!meta) return res.status(404).json({ error: 'not found' });
    res.json(meta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

// Retrieves stored metadata for an attachment id. Returns 404 when not found.

export async function deleteAttachment(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const meta = await findAttachmentById(id);
    if (!meta) return res.status(404).json({ error: 'not found' });

    // delete from S3
    await deleteObject(meta.file_key);
    // mark or remove metadata
    await removeAttachment(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

// Deletes the object from S3 using the stored file_key and removes the
// corresponding metadata row from the database. Returns { ok: true } on success.
