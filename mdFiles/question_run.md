# Run And Submit: Two Sum

## Question

Title: `Two Sum`  
Question ID: `86ed9dae-b404-48bf-ad90-2d294204da89`  
Assessment ID: `601d8324-4be0-45cd-bfd3-f937a83c865c`  
Language/environment: C++ / `cpp-gcc`

Read `n` and `target`, followed by `n` integers. Print the zero-based indices of two distinct values whose sum equals the target. Exactly one solution exists.

## Reference Answer

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    int n;
    int target;
    std::cin >> n >> target;

    std::unordered_map<int, int> firstIndex;
    for (int index = 0; index < n; ++index) {
        int value;
        std::cin >> value;

        const int complement = target - value;
        const auto match = firstIndex.find(complement);
        if (match != firstIndex.end()) {
            std::cout << match->second << ' ' << index << '\n';
            return 0;
        }

        firstIndex.emplace(value, index);
    }

    return 0;
}
```

The solution checks each value against the values seen earlier, so the two indices are distinct. It runs in expected $O(n)$ time and uses $O(n)$ additional space.

Test cases in the question:

| Input | Expected output | Points |
| --- | --- | ---: |
| `4 9` followed by `2 7 11 15` | `0 1` | 1 |
| `3 6` followed by `3 2 4` | `1 2` | 2 |

## Submit An Attempt

Call the **submission-service** directly:

```text
POST http://localhost:4020/submissions
Content-Type: application/json
```

Use the authenticated user's UUID as `submitter_id`. For an assessment submission, `assessment_id` and `question_id` are both required. Put the source code and execution settings in `metadata`:

```json
{
  "submitter_id": "<USER_UUID>",
  "assessment_id": "601d8324-4be0-45cd-bfd3-f937a83c865c",
  "question_id": "86ed9dae-b404-48bf-ad90-2d294204da89",
  "metadata": {
    "language": "cpp",
    "environment": "cpp-gcc",
    "code": "<paste the complete C++ answer above>"
  },
  "attachments": []
}
```

A successful request returns `201 Created` and a submission ID. Submit one request for each question attempted; each request is a separate question-attempt record.

## Execution And Grading Flow

With Redis and the services running, the submission-service publishes a `submission.created` event. The execution-runner consumes it, retrieves this question's stored test cases from the assessment-service, and executes the submitted code. The assessment-grader then compares each testcase result against its expected output and records the grade.

A testcase passes only when execution completed, the exit code is `0`, and the actual output matches the expected output (line endings are normalized). The grader stores per-testcase details in `assessment_submissions.grader_results` and the question score in `assessment_submissions.score`. Grading is asynchronous, so the `201` submission response may arrive before the grade is recorded.

Required services:

- `submission-service` on port `4020`
- `execution-runner` on port `4030`
- `assessment-grader`
- `assessments-service` on port `4050`
- Redis

The execution-runner must be able to reach the assessments-service. Configure the same `ASSESSMENT_INTERNAL_TOKEN` in the execution-runner and assessments-service so the runner can retrieve protected test cases. The grader also needs that token to retrieve grading cases.

## Retrieve A User's Assessment Results

The assessment attempt identifiers are stored on each row in `submissions` as `submitter_id`, `assessment_id`, and `question_id`. Grading details are stored separately in `assessment_submissions`, linked by `submission_id`. The grader table does not currently store `question_id` directly, so join it through `submissions`.

Run this query after grading has completed to retrieve all question attempts and grades for one user and assessment:

```sql
SELECT
  s.submitter_id AS user_id,
  s.assessment_id,
  s.question_id,
  s.id AS submission_id,
  s.created_at AS submitted_at,
  g.score AS question_score,
  g.graded,
  g.grader_results
FROM public.submissions AS s
LEFT JOIN public.assessment_submissions AS g
  ON g.submission_id = s.id
WHERE s.submitter_id = '<USER_UUID>'
  AND s.assessment_id = '601d8324-4be0-45cd-bfd3-f937a83c865c'
ORDER BY s.created_at, s.question_id;
```

Each result row represents one submitted question attempt. Multiple attempts for the same question are returned separately. `question_score` is the grader's percentage score for that question; use the testcase `points` and `passed` fields in `grader_results` when calculating a points-weighted assessment total. A `NULL` grade means the grader has not recorded that submission yet.

There is currently no submission-service API endpoint that returns the joined assessment-grade rows; use the database query above or add a read endpoint for this result view.
