# Python Machine Learning Practical: Execution Service Test

## Goal

Verify that a practical can be created with a supplied dataset and that the execution runner can run Python machine-learning code against that dataset in the `python-dl` sandbox. This checks environment selection, file delivery, Python dependencies, standard output, and basic error handling. It is a service smoke test, not a grading or model-quality benchmark.

## Prerequisites

- Start the practicals, file, and execution services, plus their configured database and object-storage dependencies.
- Build the Python sandbox image if it is not already available:

  ```bash
  docker build -t vpl-python-dl:1.0 docker/python-dl
  ```

- Use `http://localhost:4070` for the practicals service, `http://localhost:4040` for the file service, and `http://localhost:4030` for the execution runner. If testing through the API gateway, use the corresponding `/api/...` routes and authentication headers.
- Keep the dataset filename exactly `study_scores.csv`.

## 1. Create the Practical

Send `POST http://localhost:4070/practicals` with this body:

```json
{
  "title": "Python ML Practical - Study Hours Regression",
  "description": "Load the supplied CSV with pandas, fit a scikit-learn linear regression model to predict score from study_hours, and print the required summary.",
  "subject_id": "ml-test-001",
  "institution_id": "inst-test-001",
  "language": "python",
  "max_marks": 10,
  "metadata": {
    "environment": "python-dl",
    "dataset_filename": "study_scores.csv",
    "time_limit_sec": 60,
    "memory_mb": 2048,
    "instructions": "Use pandas and sklearn.linear_model.LinearRegression. Fit score from study_hours. Predict the score for 5.5 study hours. Print row count, coefficient, intercept, prediction, and training MAE to two decimal places."
  }
}
```

Expect `201 Created` and save the returned `id` as `{{practicalId}}`. The request records the language as Python; select `python-dl` explicitly when calling the execution runner.

## 2. Supply the Dataset to the Practical

Use this deterministic CSV dataset:

```csv
study_hours,score
1,3
2,5
3,7
4,9
5,11
6,13
7,15
8,17
```

Request a practical attachment upload URL with `POST http://localhost:4070/practicals/{{practicalId}}/presign-attachment`:

```json
{
  "fileName": "study_scores.csv",
  "contentType": "text/csv",
  "uploadedBy": "{{userId}}"
}
```

Expect a successful response containing `uploadUrl` and attachment metadata. Send an HTTP `PUT` to `uploadUrl` with the raw CSV text above as the body and `Content-Type: text/csv`. Save the attachment metadata ID for reference.

## 3. Run the ML Practical

The current execution API accepts sandbox files in the request's `files` array. A file attached to a practical is stored by the file service; it is not automatically mounted into the execution container. For this service smoke test, pass the same CSV content in `files` when running the code. This explicitly tests the runner's dataset-file path.

Send `POST http://localhost:4030/execute?sync=true` with:

```json
{
  "environment": "python-dl",
  "practical_id": "{{practicalId}}",
  "time_limit_sec": 60,
  "memory_mb": 2048,
  "files": [
    {
      "name": "study_scores.csv",
      "content": "study_hours,score\n1,3\n2,5\n3,7\n4,9\n5,11\n6,13\n7,15\n8,17\n"
    }
  ],
  "code": "import pandas as pd\nfrom sklearn.linear_model import LinearRegression\n\ndf = pd.read_csv('study_scores.csv')\nX = df[['study_hours']]\ny = df['score']\nmodel = LinearRegression().fit(X, y)\nprediction = model.predict(pd.DataFrame({'study_hours': [5.5]}))[0]\nmae = (abs(model.predict(X) - y)).mean()\n\nassert len(df) == 8\nassert abs(model.coef_[0] - 2.0) < 1e-8\nassert abs(model.intercept_ - 1.0) < 1e-8\nassert abs(prediction - 12.0) < 1e-8\nassert abs(mae) < 1e-8\nprint(f'rows={len(df)}')\nprint(f'coef={model.coef_[0]:.2f}')\nprint(f'intercept={model.intercept_:.2f}')\nprint(f'prediction_at_5.5={prediction:.2f}')\nprint(f'training_mae={mae:.2f}')"
}
```

Expect `200 OK`, `status: "completed"`, `environment: "python-dl"`, and `exit_code: 0`. The `stdout` should contain:

```text
rows=8
coef=2.00
intercept=1.00
prediction_at_5.5=12.00
training_mae=0.00
```

`stderr` should be empty. Check that execution time is present and below the 60-second limit. Artifacts may include the supplied CSV depending on the runner's artifact collection behavior; artifact presence is not a pass/fail condition for this test.

## 4. Failure-Path Checks

1. **Missing execution input:** Send `POST /execute?sync=true` with `{"environment":"python-dl"}` and no `code` or `files`. Expect `400 Bad Request` and an error explaining that code or files must be provided.
2. **Missing dataset in the sandbox:** Repeat the successful ML run without the `files` entry. The script should fail because `study_scores.csv` cannot be opened. Expect a non-zero exit code and a failed execution status, not a successful result with the expected metrics.

## Pass Criteria

- The practical is created as a Python practical, and its CSV attachment upload succeeds.
- The Python runner accepts the dataset as a workspace file, imports pandas and scikit-learn, and returns the deterministic regression output above.
- Invalid or incomplete runs are reported as errors rather than successful executions.

## Scope Note

This validates practical creation, attachment upload, and Python ML execution as separate service steps. It does not test automatic retrieval of practical attachments into a sandbox; the current execution request contract requires the dataset content to be supplied via `files` (or another explicit integration) for each run.