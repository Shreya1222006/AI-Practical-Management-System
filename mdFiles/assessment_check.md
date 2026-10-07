# Assessment API Check

Use this checklist to verify the assessment APIs directly against the assessment service.

## Setup

```bash
export BASE_URL="http://localhost:4050/assessments"
export SUBJECT_ID="<existing-subject-uuid>"
```

Replace `SUBJECT_ID` with a subject UUID that exists in the database. Start the assessment service before running these requests.

## Create A Reusable Question

- [ ] Create a question with at least one testcase. Expect `201 Created` and save the returned `id` as `QUESTION_ID`.
- [ ] Confirm returned testcase defaults: missing `input` becomes `""`, missing `points` becomes `1`, and missing `is_hidden` becomes `true`.
- [ ] Confirm optional question settings can be provided: `language`, `environment`, `time_limit_sec`, and `memory_limit_mb`.
- [ ] Confirm the API rejects missing `title`, `prompt`, or `test_cases`, an empty `test_cases` array, a testcase without string `expected_output`, and nonpositive or nonnumeric `points` with `400 Bad Request`.

```bash
curl -i -X POST "$BASE_URL/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pair Sum",
    "prompt": "Return the indices of two values whose sum equals the target.",
    "language": "cpp",
    "environment": "cpp-gcc",
    "time_limit_sec": 5,
    "memory_limit_mb": 256,
    "test_cases": [
      { "input": "4 9\n2 7 11 15\n", "expected_output": "0 1\n", "points": 1, "is_hidden": false },
      { "input": "3 6\n3 2 4\n", "expected_output": "1 2\n", "points": 2, "is_hidden": true }
    ]
  }'
```

## Create An Assessment

- [ ] Create an assessment with one or more existing question IDs. Expect `201 Created` with `questions` in the same order as `question_ids`.
- [ ] Create a second assessment referencing the same question ID. Expect success and the same question ID in both assessments.
- [ ] Confirm missing `title` or `subject_id`, an empty or missing `question_ids` array, an invalid UUID, duplicate IDs, and unknown IDs return `400 Bad Request`.

```bash
export QUESTION_ID="<id-returned-by-question-creation>"

curl -i -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{\
    \"title\": \"DSA Practice 1\",\
    \"subject_id\": \"$SUBJECT_ID\",\
    \"description\": \"Reusable question example\",\
    \"metadata\": {},\
    \"question_ids\": [\"$QUESTION_ID\"],\
    \"resources\": []\
  }"
```

Save the returned assessment `id` as `ASSESSMENT_ID` for the following checks.

## List Assessments

- [ ] List all assessments. Expect `200 OK` and an array (up to the latest 100).
- [ ] Filter by subject and confirm returned rows have the requested `subject_id`.

```bash
curl -i "$BASE_URL"
curl -i "$BASE_URL?subject_id=$SUBJECT_ID"
```

## Get An Assessment

- [ ] Fetch the created assessment. Expect `200 OK`, assessment fields, and associated question details.
- [ ] Confirm visible testcases are returned and hidden testcases are omitted from this response.
- [ ] Fetch an unknown assessment ID. Expect `404 Not Found`.

```bash
export ASSESSMENT_ID="<id-returned-by-assessment-creation>"
curl -i "$BASE_URL/$ASSESSMENT_ID"
```

## Presign An Assessment Resource

- [ ] Request a presigned upload with both `filename` and `contentType`. Expect `200 OK` with the file service response.
- [ ] Omit either field and confirm `400 Bad Request`.
- [ ] If the file service is not configured, expect `500`; if it is unavailable, expect `502`.

```bash
curl -i -X POST "$BASE_URL/$ASSESSMENT_ID/presign-resource" \
  -H "Content-Type: application/json" \
  -d '{ "filename": "starter.cpp", "contentType": "text/plain" }'
```

## Execution Cases

- [ ] Call the direct service endpoint with a valid assessment/question pair. The current service guard returns `401 Unauthorized` for this request.

```bash
curl -i "$BASE_URL/$ASSESSMENT_ID/questions/$QUESTION_ID/execution-cases"
```

## Grading Cases

- [ ] Call the direct service endpoint with a valid assessment/question pair. The current service guard returns `401 Unauthorized` for this request.

```bash
curl -i "$BASE_URL/$ASSESSMENT_ID/questions/$QUESTION_ID/grading-cases"
```