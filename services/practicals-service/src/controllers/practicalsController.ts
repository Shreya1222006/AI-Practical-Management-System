import { Request, Response } from 'express';
import * as repo from '../models/practicalRepo';
import { publishEvent } from '../utils/events';
import axios from 'axios';
import { getConfig } from '../../../../libs/shared/config';

const cfg = getConfig();
const fileServiceUrl = process.env.FILE_SERVICE_URL || `http://localhost:${process.env.PORT_FILE_SERVICE || 4040}`;

export async function createPractical(req: Request, res: Response) {
  try {
    const data = req.body;
    const row = await repo.createPractical(data);
    await publishEvent('practical.created', { id: row.id, title: row.title });
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

export async function listPracticals(req: Request, res: Response) {
  try {
    const rows = await repo.listPracticals();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

export async function getPractical(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const row = await repo.getPracticalById(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

export async function updatePractical(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const patch = req.body;
    const updated = await repo.updatePractical(id, patch);
    if (!updated) return res.status(404).json({ error: 'not found' });
    await publishEvent('practical.updated', { id: updated.id, title: updated.title });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
}

export async function presignAttachment(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { fileName, contentType, uploadedBy, fileSize } = req.body;
    if (!fileName || !contentType || !uploadedBy) return res.status(400).json({ error: 'missing fields' });

    // Proxy to file-service
    const payload = { fileName, contentType, activityType: 'practical', activityId: id, uploadedBy, fileSize };
    const r = await axios.post(`${fileServiceUrl}/files/presign`, payload, { timeout: 5000 });
    res.json(r.data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'file-service unavailable' });
  }
}
