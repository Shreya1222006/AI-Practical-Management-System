# Evaluation Guide — Practical vs Assessment

> **Purpose:** Define how grading works on the platform. There are only **two activity types**. Use this before designing schemas and UI.
>
> **Related:** [README.md](./README.md) · [entities.md](./entities.md) — full database schemas

---

## Table of Contents

1. [Two activity types](#1-two-activity-types)
2. [Practical (default)](#2-practical-default)
3. [Assessment (test-case based)](#3-assessment-test-case-based)
4. [Subject-wise reference](#4-subject-wise-reference)
5. [Schema implications](#5-schema-implications)

---

## 1. Two activity types

| | **Practical** | **Assessment** |
|---|---------------|----------------|
| **Purpose** | Regular lab work across all subjects | Teacher-conducted evaluation (exam-style) |
| **When used** | Always — default for every lab assignment | Only when teacher creates an Assessment |
| **Evaluation** | Teacher reviews **code + execution output** | **Auto-graded** via test cases (LeetCode-style) |
| **Run** | Execute in Docker; show stdout/stderr, errors, runtime | Run against **sample** test cases |
| **Submit** | Save code + captured output for teacher | Run against **all** test cases (incl. hidden); compute score |
| **Result UI** | Code viewer + formatted execution output | Pass/fail per test case, score, statuses like `Accepted` / `Wrong Answer` |
| **Marks** | Teacher assigns manually | Auto-score (+ optional teacher override) |

```
Regular lab flow (Practical)          Exam / quiz flow (Assessment)
─────────────────────────────         ───────────────────────────────
Teacher uploads practical             Teacher creates assessment
Student writes code                   Student writes code
Run → see output                      Run → sample test cases
Submit → code + output stored         Submit → all test cases → auto score
Teacher reviews & marks               Results shown LeetCode-style
```

---

## 2. Practical (default)

Every subject uses this for normal lab assignments.

### What the student sees

- Problem description, instructions, sample I/O (as **reference only** — not auto-graded).
- Monaco editor (or SQL / notebook editor per subject).
- **Run** — code executes in an isolated Docker container.
- **Submit** — permanently saves code + execution snapshot.

### What the platform stores & displays

| Stored | Displayed to student / teacher |
|--------|-------------------------------|
| Source code | Syntax-highlighted code panel |
| stdout, stderr | Console output panel |
| exit code, runtime, memory | Execution metadata bar |
| Generated files (plots, CSV) | File preview / download links |
| SQL result grids (DBMS) | Table viewer |
| Timestamp, attempt number | Submission history |

### Submission statuses (Practical)

| Status | Meaning |
|--------|---------|
| `Submitted` | Saved; awaiting teacher review |
| `Executed` | Ran successfully; output captured |
| `Compilation Error` | Code did not compile |
| `Runtime Error` | Crashed during execution |
| `Time Limit Exceeded` | Exceeded time limit |
| `Evaluated` | Teacher assigned marks/feedback |

### Teacher workflow

1. View list of student submissions for a practical.
2. Open submission → see **code side-by-side with execution output**.
3. Assign marks and written feedback.
4. Publish results.

> **No test cases, no auto-score, no hidden tests** for practicals. The teacher is the evaluator.

---

## 3. Assessment (test-case based)

Used only when a teacher explicitly creates an **Assessment** (not a regular practical).

### What the student sees (LeetCode-style)

- Problem statement with constraints and **sample test cases** (input + expected output visible).
- Monaco editor.
- **Run** — executes against sample test cases only; shows pass/fail per case.
- **Submit** — runs against **all** test cases including hidden ones; shows final score.

### What the platform stores & displays

| Stored | Displayed |
|--------|-----------|
| Source code | Code panel |
| Per-test-case result | Input, expected output, actual output, pass/fail |
| Aggregate score | `12/15 test cases passed` |
| Runtime / memory per case | Performance metrics |

### Submission statuses (Assessment)

| Status | Meaning |
|--------|---------|
| `Accepted` | All test cases passed |
| `Wrong Answer` | Output mismatch on one or more cases |
| `Time Limit Exceeded` | Exceeded time on a test case |
| `Runtime Error` | Crashed on a test case |
| `Compilation Error` | Did not compile |

### Teacher workflow

1. Create assessment with problem statement + test cases (sample + hidden).
2. Assign to batch with deadline.
3. Submissions auto-graded on submit.
4. Teacher reviews scores, may override marks or add feedback.
5. Export results.

### When to use Assessment

| Good fit | Not a good fit |
|----------|----------------|
| DSA algorithm problems (exact I/O) | OOP class design labs |
| Short coding quizzes | OS scheduling table output |
| Exam-style timed problems | DBMS query design (many valid SQL forms) |
| Practice problems with clear answers | ML/DL notebook labs |
| | Project-style multi-file submissions |

---

## 4. Subject-wise reference

How execution **output is displayed** for practicals, and when **assessments** are appropriate.

### 4.1 DSA — Data Structures & Algorithms

**Environment:** C++ / Python — Docker `vpl-cpp-runner`, `vpl-python-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| Single values, lists, sorted arrays | Yes — ideal for test-case assessment |
| Matrix prints, traversal sequences | Yes — with exact I/O test cases |
| Menu-driven ADT demos (insert/delete/display) | Practical only — teacher reviews interaction |

**Example practical display:**

```
--- stdout ---
Enter size: 5
Enter elements: 1 2 3 4 5
Sorted array: 1 2 3 4 5
Top 5 scores: [98.5, 97.2, 96.0, 95.5, 94.1]

Execution time: 42ms | Exit code: 0
```

---

### 4.2 OOP — Object-Oriented Programming

**Environment:** C++ — Docker `vpl-cpp-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| Object state prints, polymorphism demo logs | Practical only |
| Bank/library system transaction tables | Practical only |
| Multi-file class projects | Practical only — code tree + output |

**Example practical display:**

```
--- stdout ---
Complex Number: 3 + 4i
Sum: 5 + 7i

Account No: 1001 | Balance: 5000.00
1. Deposit  2. Withdraw  3. Statement
Choice: 3
Date       | Type     | Amount  | Balance
2026-08-15 | Deposit  | 1000.00 | 6000.00

Execution time: 18ms | Exit code: 0
```

Teacher grades design, encapsulation, and correctness — not auto-tests.

---

### 4.3 OS — Operating Systems

**Environment:** C/C++ — Docker `vpl-cpp-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| Scheduling tables, Gantt charts, avg waiting time | Practical only |
| Page replacement fault counts | Rarely — only if exact numeric output defined |
| Producer-consumer traces | Practical only |

**Example practical display:**

```
--- stdout ---
--- FCFS Scheduling ---
Process | Burst | Waiting | Turnaround
   P1   |   6   |    0    |     6
   P2   |   8   |    6    |    14

Average Waiting Time: 10.25
Gantt Chart: | P1 | P2 | P3 | P4 |
              0    6   14   21   24

Execution time: 55ms | Exit code: 0
```

Output is shown as formatted text; teacher verifies algorithm correctness.

---

### 4.4 DBMS — Database Management Systems

**Environment:** PostgreSQL — Docker `vpl-postgres-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| SQL query result tables | Practical only (teacher checks result) |
| DDL success messages | Practical only |
| PL/SQL DBMS_OUTPUT | Practical only |
| ER diagram uploads | Practical only — file attachment, no execution |

**Example practical display:**

```
--- SQL Query ---
SELECT e.name, d.dept_name, e.salary
FROM employee e JOIN department d ON e.dept_id = d.dept_id
WHERE e.salary > 50000;

--- Result (3 rows) ---
| name   | dept_name | salary |
|--------|-----------|--------|
| Rahul  | IT        | 75000  |
| Priya  | CS        | 62000  |
| Amit   | IT        | 55000  |

Execution time: 120ms | Exit code: 0
```

For assessments, teacher would need problems with **exact expected result sets** as test cases (advanced; optional future feature).

---

### 4.5 ML — Machine Learning

**Environment:** Python / Jupyter — Docker `vpl-python-runner`, `vpl-jupyter-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| Metric prints (accuracy, MSE, R²) | Practical only |
| Confusion matrix text output | Practical only |
| Plots (PNG rendered inline) | Practical only — image preview |
| Notebook with cell outputs | Practical only — notebook viewer |

**Example practical display:**

```
--- stdout ---
Train size: 404, Test size: 102
MSE: 21.641 | R²: 0.672

--- Artifacts ---
📊 confusion_matrix.png  (preview)
📓 lab4.ipynb            (notebook viewer)

Execution time: 8.2s | Exit code: 0
```

---

### 4.6 DL — Deep Learning

**Environment:** Python + TensorFlow/PyTorch — Docker `vpl-jupyter-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| Training epoch logs | Practical only |
| Test accuracy / loss | Practical only |
| Training curve plots, sample predictions | Practical only |
| Saved model files | Practical only — download link |

**Example practical display:**

```
--- stdout ---
Epoch 10/10 - loss: 0.0456 - accuracy: 0.9876
Test Accuracy: 0.974

--- Artifacts ---
📊 training_loss.png
📊 sample_predictions.png
📁 model.h5

Execution time: 4m 32s | Exit code: 0
```

---

### 4.7 DS — Data Science & Analytics

**Environment:** Python + pandas, matplotlib, seaborn — Docker `vpl-jupyter-runner`

| Practical output (display) | Assessment use |
|----------------------------|----------------|
| pandas describe / groupby tables | Practical only |
| Visualizations (histogram, boxplot) | Practical only |
| Notebook markdown + code outputs | Practical only |
| Hadoop/Spark WordCount output | Practical only |

**Example practical display:**

```
--- stdout ---
       sepal_length  sepal_width  petal_length  petal_width
count    50.0         50.0         50.0          50.0
mean      5.84         3.05         1.50          0.24

--- Artifacts ---
📊 fare_histogram.png
📊 age_survival_boxplot.png

Execution time: 3.1s | Exit code: 0
```

---

### Subject summary

| Subject | Practical (always) | Assessment (optional) |
|---------|-------------------|----------------------|
| DSA | Code + stdout | **Yes** — primary use case |
| OOP | Code + stdout | Rarely |
| OS | Code + formatted tables | Rarely |
| DBMS | SQL + result grid | Rarely (exact result set needed) |
| ML | Code/notebook + metrics + plots | No |
| DL | Notebook + training logs + plots | No |
| DS | Notebook + stats + plots | No |

---

## 5. Schema implications

### 5.1 Activity type field

Every teacher-created item is either a **practical** or an **assessment**:

```
activity_type: 'practical' | 'assessment'
```

Shared fields: `subject_id`, `title`, `description`, `env_type`, `language`, `due_date`, `max_marks`, `created_by`, time/memory limits.

### 5.2 Practical-specific

| Table / field | Purpose |
|---------------|---------|
| `practicals` | `activity_type = 'practical'` |
| `submissions.code` | Student source code |
| `submissions.stdout`, `stderr` | Execution output |
| `submissions.artifacts` | JSON array of file URLs (plots, notebooks) |
| `submissions.status` | `Submitted`, `Executed`, `Evaluated`, errors |
| `evaluations.manual_score`, `feedback` | Teacher marks |

No `test_cases` table linked to practicals.

### 5.3 Assessment-specific

| Table / field | Purpose |
|---------------|---------|
| `assessments` | `activity_type = 'assessment'` |
| `test_cases` | `assessment_id`, input, expected_output, is_sample, is_hidden, points |
| `submissions.test_results` | JSONB — per-case pass/fail, actual vs expected |
| `submissions.auto_score` | Computed from test cases |
| `submissions.status` | `Accepted`, `Wrong Answer`, TLE, RE, CE |
| `evaluations.manual_score` | Optional teacher override |

### 5.4 Shared submission fields

```
submissions:
  id, student_id, activity_id, activity_type,
  code, language,
  stdout, stderr, exit_code, exec_time_ms, memory_kb,
  artifacts (JSONB),
  submitted_at,
  -- assessment only:
  test_results (JSONB), auto_score,
  -- grading:
  manual_score, final_score, feedback, evaluated_by, evaluated_at
```

### 5.5 UI routes (planned)

| Route | Type |
|-------|------|
| `/practicals/:id` | Problem + editor + Run/Submit + output panel |
| `/practicals/:id/submissions/:sid` | Code + output side-by-side (teacher view) |
| `/assessments/:id` | LeetCode-style problem + editor + test case panel |
| `/assessments/:id/submissions/:sid` | Code + test case breakdown |

### 5.6 Execution service

```
Run/Submit request
  → read activity_type
  → if practical: execute in Docker → capture output → store
  → if assessment: execute against test cases → compare → store results + score
```

---

*Last updated: August 2026*
