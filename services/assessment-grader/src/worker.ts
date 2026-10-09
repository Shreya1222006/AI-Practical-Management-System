import axios from 'axios';
import { getJobsCollection } from './utils/mongo';
import { updateAssessmentSubmission } from './models/assessmentSubmissionRepo';
import IORedis from 'ioredis';
import { getConfig } from '../../../libs/shared/config';

const config = getConfig();
const REDIS_URL = process.env.REDIS_URL || config.redisUrl;

function normalizeOutput(output: string) {
  return output.replace(/\r\n/g, '\n');
}

export function computeScore(testCases: any[], actualResults: any[]) {
  const actualById = new Map(actualResults.map((result) => [result.test_case_id, result]));
  let totalPoints = 0;
  let earnedPoints = 0;
  const results = testCases.map((testCase) => {
    const points = Number(testCase.points ?? 1);
    const actual = actualById.get(testCase.id);
    const expectedOutput = String(testCase.expected_output ?? '');
    const actualOutput = String(actual?.actual_output ?? '');
    const passed = actual?.status === 'completed'
      && actual.exit_code === 0
      && normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);
    totalPoints += points;
    if (passed) earnedPoints += points;
    return {
      test_case_id: testCase.id,
      position: testCase.position,
      passed,
      points,
      expected_output: expectedOutput,
      actual_output: actualOutput,
      status: actual?.status || 'not_executed',
      exit_code: actual?.exit_code ?? null,
      execution_time_ms: actual?.execution_time_ms ?? 0,
      stderr: actual?.stderr || ''
    };
  });
  return {
    total_points: totalPoints,
    earned_points: earnedPoints,
    score: totalPoints ? (earnedPoints / totalPoints) * 100 : 0,
    passed: results.length > 0 && results.every((result) => result.passed),
    results
  };
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
  const questionId = data.question_id || submission.question_id || submission.metadata?.question_id;
  if (!questionId) {
    console.error('question_id missing; cannot grade assessment submission', submission_id);
    return;
  }

  const assessmentsSvc = process.env.ASSESSMENTS_SERVICE_URL || config.assessmentsServiceUrl;
  if (!assessmentsSvc) throw new Error('ASSESSMENTS_SERVICE_URL not configured');
  const token = process.env.ASSESSMENT_INTERNAL_TOKEN;
  if (!token) throw new Error('ASSESSMENT_INTERNAL_TOKEN is required for grading testcase retrieval');
  const casesResp = await axios.get(
    `${assessmentsSvc.replace(/\/$/, '')}/assessments/${assessmentId}/questions/${questionId}/grading-cases`,
    { headers: { 'x-assessment-internal-token': token } }
  );
  const scoring = computeScore(casesResp.data, job.test_case_results || []);

  const record = await updateAssessmentSubmission({
    submission_id,
    assessment_id: assessmentId,
    question_id: questionId,
    grader_results: scoring.results,
    score: scoring.score
  });

  // publish grading.completed
  if (REDIS_URL) {
    const redis = new IORedis(REDIS_URL);
    await redis.publish('grading.events', JSON.stringify({ type: 'grading.completed', data: {
      assessment_submission_id: record.id,
      submission_id,
      assessment_id: assessmentId,
      question_id: questionId,
      score: scoring.score,
      earned_points: scoring.earned_points,
      total_points: scoring.total_points,
      passed: scoring.passed,
      results: scoring.results
    } }));
    redis.disconnect();
  } else {
    console.log('grading.completed', record.id);
  }
}
