import axios from 'axios';
import { getJobsCollection } from './utils/mongo';
import { createAssessmentSubmission } from './models/assessmentSubmissionRepo';
import IORedis from 'ioredis';
import { getConfig } from '../../../libs/shared/config';

const config = getConfig();
const REDIS_URL = process.env.REDIS_URL || config.redisUrl;

function computeScoreFromLogs(test_cases: any[], logsText: string) {
  const results: any[] = [];
  let total = 0;
  let earned = 0;
  for (const tc of test_cases || []) {
    const points = tc.points || 1;
    total += points;
    const expected = tc.expected?.toString() || '';
    const ok = expected ? logsText.includes(expected) : false;
    if (ok) earned += points;
    results.push({ name: tc.name || tc.id, expected, ok, points });
  }
  const score = total ? (earned / total) * 100 : 0;
  return { total, earned, score, results };
}

export async function handleExecutionCompleted(data: any, evType: string) {
  // data: { jobId, submission_id }
  const jobId = data.jobId;
  const submission_id = data.submission_id;
  const jobs = getJobsCollection();
  const job = await jobs.findOne({ _id: jobId });
  if (!job) {
    console.error('job not found', jobId);
    return;
  }

  // fetch submission metadata
  const submissionSvc = process.env.SUBMISSION_SERVICE_URL || config.submissionServiceUrl;
  if (!submissionSvc) throw new Error('SUBMISSION_SERVICE_URL not configured');
  const submissionResp = await axios.get(`${submissionSvc.replace(/\/$/, '')}/submissions/${submission_id}`);
  const submission = submissionResp.data;

  const assessmentId = submission.assessment_id;
  if (!assessmentId) {
    console.log('no assessment linked; skipping grading');
    return;
  }

  const assessmentsSvc = process.env.ASSESSMENTS_SERVICE_URL || config.assessmentsServiceUrl;
  if (!assessmentsSvc) throw new Error('ASSESSMENTS_SERVICE_URL not configured');
  const assessResp = await axios.get(`${assessmentsSvc.replace(/\/$/, '')}/assessments/${assessmentId}`);
  const assessment = assessResp.data;

  // assemble logs text
  const logs = (job.logs || []).map((l: any) => l.line || l).join('\n');

  const tc = assessment.test_cases || [];
  const scoring = computeScoreFromLogs(tc, logs + '\n' + (submission.metadata?.output || ''));

  const record = await createAssessmentSubmission({ submission_id, assessment_id: assessmentId, grader_results: scoring.results, score: scoring.score });

  // publish grading.completed
  if (REDIS_URL) {
    const redis = new IORedis(REDIS_URL);
    await redis.publish('grading.events', JSON.stringify({ type: 'grading.completed', data: { assessment_submission_id: record.id, submission_id, score: scoring.score, results: scoring.results } }));
    redis.disconnect();
  } else {
    console.log('grading.completed', record.id);
  }
}
// Placeholder worker: subscribes to job-completed events and computes auto-scores

import { setTimeout } from 'timers/promises';

async function main() {
  console.log('Assessment grader worker running (placeholder)');
  while (true) {
    // In production, subscribe to message bus and process events
    await setTimeout(60000);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
