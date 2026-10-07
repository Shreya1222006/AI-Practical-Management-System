import { Request, Response } from 'express';
import * as repo from '../models/assessmentRepo';
import axios from 'axios';
import { getConfig } from '../../../../libs/shared/config';
import IORedis from 'ioredis';

const config = getConfig();

function getQuestionValidationError(question: any) {
  if (!question?.title || !question?.prompt || !Array.isArray(question.test_cases) || question.test_cases.length === 0) {
    return 'question requires title, prompt, and at least one test case';
  }
  if (question.test_cases.some((testCase: any) => typeof testCase.expected_output !== 'string')) {
    return 'each test case requires expected_output as a string';
  }
  if (question.test_cases.some((testCase: any) => testCase.points !== undefined &&
    (!Number.isFinite(Number(testCase.points)) || Number(testCase.points) <= 0))) {
    return 'test case points must be greater than zero';
  }
  return null;
}

export async function createQuestion(req: Request, res: Response) {
  const validationError = getQuestionValidationError(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const created = await repo.createQuestion(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function createAssessment(req: Request, res: Response) {
  const { title, subject_id, description, metadata, question_ids, resources } = req.body;
  if (!title || !subject_id) return res.status(400).json({ error: 'title and subject_id required' });
  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ error: 'at least one question_id is required' });
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (question_ids.some((questionId: unknown) => typeof questionId !== 'string' || !uuidPattern.test(questionId))) {
    return res.status(400).json({ error: 'question_ids must contain valid question UUIDs' });
  }
  if (new Set(question_ids).size !== question_ids.length) {
    return res.status(400).json({ error: 'question_ids must not contain duplicates' });
  }
  try {
    const created = await repo.create({ title, subject_id, description, metadata, question_ids, resources });
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
    if (err?.message === 'QUESTION_IDS_NOT_FOUND') {
      return res.status(400).json({ error: 'one or more question_ids do not exist' });
    }
    res.status(500).json({ error: 'failed' });
  }
}

export async function getExecutionCases(req: Request, res: Response) {
  if (!process.env.ASSESSMENT_INTERNAL_TOKEN || req.header('x-assessment-internal-token') !== process.env.ASSESSMENT_INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const result = await repo.listExecutionCases(String(req.params.id), String(req.params.questionId));
    if (!result) return res.status(404).json({ error: 'question not found' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function getGradingCases(req: Request, res: Response) {
  if (!process.env.ASSESSMENT_INTERNAL_TOKEN || req.header('x-assessment-internal-token') !== process.env.ASSESSMENT_INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const result = await repo.listGradingCases(String(req.params.id), String(req.params.questionId));
    if (!result) return res.status(404).json({ error: 'question not found' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function listAssessments(req: Request, res: Response) {
  const subject_id = req.query.subject_id as string | undefined;
  try {
    const list = subject_id ? await repo.findBySubject(subject_id) : await repo.listAll();
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
