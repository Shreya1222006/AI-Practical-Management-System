# Assessment API Check

Use this checklist to verify the assessment APIs directly against the assessment service.

## Setup

```bash
export BASE_URL="http://localhost:4050/assessments"
export SUBJECT_ID="<existing-subject-uuid>"
```

Replace `SUBJECT_ID` with a subject UUID that exists in the database. Start the assessment service before running these requests.

## Create A Reusable Question

- [ ] Send each body below to `POST /questions`. Expect `201 Created` and save each returned `id` as `QUESTION_ID_1` through `QUESTION_ID_5`.
- [ ] Confirm returned testcase defaults: missing `input` becomes `""`, missing `points` becomes `1`, and missing `is_hidden` becomes `true`.
- [ ] Confirm optional question settings can be provided: `language`, `environment`, `time_limit_sec`, and `memory_limit_mb`.
- [ ] Confirm the API rejects missing `title`, `prompt`, or `test_cases`, an empty `test_cases` array, a testcase without string `expected_output`, and nonpositive or nonnumeric `points` with `400 Bad Request`.

### Question 1: Two Sum

Request body:

```json
{
  "title": "Two Sum",
  "prompt": "Read n and target, followed by n integers. Print the zero-based indices of two distinct values that sum to target. Assume exactly one solution exists.",
  "language": "cpp",
  "environment": "cpp-gcc",
  "time_limit_sec": 2,
  "memory_limit_mb": 128,
  "test_cases": [
    { "input": "4 9\n2 7 11 15\n", "expected_output": "0 1\n", "points": 1, "is_hidden": false },
    { "input": "3 6\n3 2 4\n", "expected_output": "1 2\n", "points": 2, "is_hidden": true }
  ]
}
```

### Question 2: Palindrome Check

Request body:

```json
{
  "title": "Palindrome Check",
  "prompt": "Read one lowercase word. Print true if it reads the same forwards and backwards; otherwise print false.",
  "language": "cpp",
  "environment": "cpp-gcc",
  "time_limit_sec": 2,
  "memory_limit_mb": 128,
  "test_cases": [
    { "input": "racecar\n", "expected_output": "true\n", "points": 1, "is_hidden": false },
    { "input": "hello\n", "expected_output": "false\n", "points": 1, "is_hidden": true }
  ]
}
```

### Question 3: Valid Parentheses

Request body:

```json
{
  "title": "Valid Parentheses",
  "prompt": "Read a string containing parentheses, square brackets, and braces. Print true when every opening bracket is closed by the correct type in the correct order; otherwise print false.",
  "language": "cpp",
  "environment": "cpp-gcc",
  "time_limit_sec": 2,
  "memory_limit_mb": 128,
  "test_cases": [
    { "input": "{[()]}\n", "expected_output": "true\n", "points": 1, "is_hidden": false },
    { "input": "{[(])}\n", "expected_output": "false\n", "points": 2, "is_hidden": true }
  ]
}
```

### Question 4: Binary Search

Request body:

```json
{
  "title": "Binary Search",
  "prompt": "Read n and target, followed by n integers sorted in ascending order. Print the zero-based index of target, or -1 when target is not present.",
  "language": "cpp",
  "environment": "cpp-gcc",
  "time_limit_sec": 2,
  "memory_limit_mb": 128,
  "test_cases": [
    { "input": "5 9\n1 3 5 7 9\n", "expected_output": "4\n", "points": 1, "is_hidden": false },
    { "input": "4 2\n1 3 5 7\n", "expected_output": "-1\n", "points": 2, "is_hidden": true }
  ]
}
```

### Question 5: Maximum Subarray Sum

Request body:

```json
{
  "title": "Maximum Subarray Sum",
  "prompt": "Read n followed by n integers. Print the largest sum of any nonempty contiguous subarray.",
  "language": "cpp",
  "environment": "cpp-gcc",
  "time_limit_sec": 2,
  "memory_limit_mb": 128,
  "test_cases": [
    { "input": "9\n-2 1 -3 4 -1 2 1 -5 4\n", "expected_output": "6\n", "points": 1, "is_hidden": false },
    { "input": "5\n5 4 -1 7 8\n", "expected_output": "23\n", "points": 2, "is_hidden": true }
  ]
}
```

Send each JSON object as the request body to `POST http://localhost:4050/assessments/questions`.

## Create An Assessment

- [ ] Send each body below to `POST /`. Replace all question ID placeholders with the UUIDs returned when creating the five questions. Expect `201 Created` with `questions` in the same order as `question_ids`.
- [ ] Confirm question 3 appears in both assessments with the same question ID.
- [ ] Confirm missing `title` or `subject_id`, an empty or missing `question_ids` array, an invalid UUID, duplicate IDs, and unknown IDs return `400 Bad Request`.

### Assessment 1: Arrays And Strings

Request body:

```json
{
  "title": "DSA Practice 1: Arrays And Strings",
  "subject_id": "<SUBJECT_ID>",
  "description": "Practice array and string problems.",
  "metadata": { "duration_minutes": 45, "difficulty": "beginner" },
  "question_ids": [
    "<QUESTION_ID_1>",
    "<QUESTION_ID_2>",
    "<QUESTION_ID_3>"
  ],
  "resources": []
}
```

### Assessment 2: Core DSA Practice

Request body:

```json
{
  "title": "DSA Practice 2: Core Algorithms",
  "subject_id": "<SUBJECT_ID>",
  "description": "Practice stacks, searching, and subarray algorithms.",
  "metadata": { "duration_minutes": 60, "difficulty": "intermediate" },
  "question_ids": [
    "<QUESTION_ID_3>",
    "<QUESTION_ID_4>",
    "<QUESTION_ID_5>"
  ],
  "resources": []
}
```

Replace the placeholders with actual UUID strings before sending each body to `POST http://localhost:4050/assessments`. Save the returned IDs as `ASSESSMENT_ID_1` and `ASSESSMENT_ID_2`.

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
export ASSESSMENT_ID="<ASSESSMENT_ID_1>"
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
curl -i "$BASE_URL/$ASSESSMENT_ID/questions/<QUESTION_ID_1>/execution-cases"
```

## Grading Cases

- [ ] Call the direct service endpoint with a valid assessment/question pair. The current service guard returns `401 Unauthorized` for this request.

```bash
curl -i "$BASE_URL/$ASSESSMENT_ID/questions/<QUESTION_ID_1>/grading-cases"
```