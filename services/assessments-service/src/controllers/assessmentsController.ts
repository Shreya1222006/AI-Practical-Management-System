import { Request, Response } from 'express';
import * as repo from '../models/assessmentRepo';
import axios from 'axios';
import { getConfig } from '../../../../libs/shared/config';
import IORedis from 'ioredis';

const config = getConfig();

export async function createAssessment(req: Request, res: Response) {
  const { title, course_id, description, metadata, test_cases, resources } = req.body;
  if (!title || !course_id) return res.status(400).json({ error: 'title and course_id required' });
  try {
    const created = await repo.create({ title, course_id, description, metadata, test_cases, resources });
    // publish event
    if (config.redisUrl) {
      const redis = new IORedis(config.redisUrl);
      await redis.publish('assessments.events', JSON.stringify({ type: 'assessment.created', data: created }));
      redis.disconnect();
    } else {
      console.log('assessment.created', created.id);
    }
    res.status(201).json(created);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function listAssessments(req: Request, res: Response) {
  const course_id = req.query.course_id as string | undefined;
  try {
    const list = course_id ? await repo.findByCourse(course_id) : await repo.listAll();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function getAssessment(req: Request, res: Response) {
  const  id  = String(req.params.id);
  try {
    const item = await repo.findById(id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function presignResource(req: Request, res: Response) {
  const { id } = req.params;
  const { filename, contentType } = req.body;
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });
  const fileService = process.env.FILE_SERVICE_URL || config.fileServiceUrl;
  if (!fileService) return res.status(500).json({ error: 'file service not configured' });
  try {
    const resp = await axios.post(`${fileService.replace(/\/$/, '')}/presign`, { filename, contentType });
    res.json(resp.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    res.status(502).json({ error: 'file service error' });
  }
}
