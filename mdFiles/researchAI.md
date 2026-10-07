# Research AI Roadmap

## AI-Powered Virtual Practical Laboratory System

This document defines a research-level AI implementation plan for the Virtual Practical Laboratory. It is organized by priority, research value, implementation dependency, and risk.

The existing platform already provides the right foundation: practical and assessment records, immutable submissions, Docker execution results, teacher feedback, test-case scores, execution logs, and multiple subject environments. AI should be added as an evidence-based layer around this foundation.

The most important principle is:

> AI should assist students and teachers, explain its evidence, and remain subject to deterministic checks and human review. It should not silently replace assessment decisions.

---

## 1. Current Baseline

### Existing platform capabilities

- Authentication and role-based access.
- Practical and assessment management.
- Student code submission and attempt history.
- C++, Python/Deep Learning, and PostgreSQL execution environments.
- Docker-based sandbox execution with CPU, memory, timeout, and network restrictions.
- Automatic assessment grading using test cases.
- Teacher review and feedback workflow.
- PostgreSQL for relational data.
- MongoDB for execution logs and traces.
- Redis for queues and events.
- S3/MinIO for large files and datasets.

### Current AI scope

AI chatbot, retrieval-augmented generation, embeddings, and AI-assisted evaluation are not currently implemented. They should be introduced as separate services so that an AI failure cannot stop authentication, submissions, execution, or deterministic grading.

---

## 2. Research Vision

The research goal is to build an **Evidence-Based Intelligent Practical Laboratory** that can:

1. Understand practical statements, course material, code, output, and test results.
2. Give students personalized hints without directly revealing complete solutions.
3. Help teachers review large numbers of submissions consistently.
4. Detect learning difficulties and recommend targeted practice.
5. Explain its recommendations using retrieved project evidence.
6. Measure whether AI actually improves learning, feedback quality, fairness, and teacher productivity.

A strong research contribution is not simply adding an API call to a large language model. The contribution should define a problem, create or curate a dataset, propose a method, compare baselines, measure outcomes, analyze errors, and document limitations.

---

## 3. Priority Levels

| Priority | Meaning | Recommended timing |
|---|---|---|
| P0 - Foundation | Required before trustworthy AI experiments | First |
| P1 - High value | Safe, useful features with manageable research risk | After foundation |
| P2 - Research core | Features suitable for experiments, datasets, and publications | After P1 data exists |
| P3 - Advanced | High novelty or high-risk features requiring mature evaluation | Later |
| P4 - Future | Interesting ideas that should not block the core product | Optional |

---

## 4. Recommended Implementation Sequence

```text
P0 Data, privacy, evaluation, and AI service boundary
        |
        v
P1 Grounded help: document search and explainable hints
        |
        v
P1 Code feedback: error explanation and feedback drafts
        |
        v
P2 Personalized learning recommendations
        |
        v
P2 Research grading assistant with teacher approval
        |
        v
P3 Learning analytics, knowledge tracing, and early support
        |
        v
P3 Multimodal notebook and artifact understanding
        |
        v
P4 Adaptive assessment generation and advanced research models
```

Do not begin with autonomous grading or a general chatbot. Those features have the highest risk and depend on reliable data, evaluation, permissions, and auditability.

---

# 5. P0 - Foundation and Safety

## P0.1 Create an AI service boundary

Add a separate `ai-service` rather than embedding model calls in every existing service.

### Responsibilities

- Prompt and model orchestration.
- Retrieval and embedding pipeline.
- AI request authentication and authorization.
- Conversation and feedback audit records.
- Model version and prompt version tracking.
- Safety filters and rate limits.
- Evaluation hooks and confidence metadata.

### Suggested endpoints

```text
POST /ai/hints
POST /ai/explain-error
POST /ai/feedback-draft
POST /ai/search
POST /ai/recommendations
GET  /ai/interactions/:id
```

The AI service should receive references such as `student_id`, `practical_id`, `submission_id`, and `execution_job_id`, then fetch only the data the caller is authorized to access.

## P0.2 Build an AI data model

Add records for:

- `ai_interactions`: user, feature, request, response, model version, prompt version, latency, token cost, timestamp.
- `ai_feedback`: submission, teacher approval status, edited response, confidence, evidence references.
- `knowledge_documents`: source type, subject, version, access scope, checksum, and ingestion status.
- `knowledge_chunks`: document reference, chunk text or vector reference, metadata, and embedding model.
- `recommendations`: user, topic, reason, evidence, status, and outcome.
- `model_evaluations`: dataset version, model version, metric, result, and experiment metadata.

Store sensitive values carefully. Do not retain raw passwords, secrets, private tokens, or unnecessary student personal information in AI prompts or logs.

## P0.3 Define privacy and governance

Before using real student data:

- Obtain institutional approval and consent where required.
- Define data retention and deletion policies.
- Minimize personally identifiable information.
- Separate student identity from research identifiers.
- Restrict teacher and student data by institution and role.
- Do not send private submissions to an external model without an approved data-processing agreement.
- Provide an explanation and feedback-report mechanism.
- Record which model, prompt, documents, and evidence produced every answer.

## P0.4 Create an evaluation protocol

Every AI feature must have:

- A clear task definition.
- A non-AI baseline.
- A held-out test set.
- Offline metrics.
- Human review criteria.
- Failure and safety tests.
- A rollback condition.

Recommended experiment record:

```text
experiment_id
feature_name
dataset_version
model_name
embedding_model
prompt_version
retrieval_configuration
hyperparameters
metrics
reviewers
known_failures
```

## P0.5 Establish baseline measurements

Measure the current system before AI is added:

- Teacher time per submission.
- Time to identify a common student error.
- Number of feedback revisions.
- Student resubmission rate.
- Assessment completion and pass rates.
- Help requests per practical.
- Teacher agreement on manually assigned feedback.
- Execution failure categories.

These measurements are required to prove that AI improves the system rather than merely producing more text.

---

# 6. P1 - Grounded Student Support

## P1.1 Research-backed RAG learning assistant

### Goal

Answer questions about practical instructions, course notes, allowed APIs, execution environments, and institutional learning material using retrieved project documents.

### Sources

- Practical statements.
- Teacher-approved manuals.
- Course notes.
- Subject reference material.
- Execution environment documentation.
- Frequently asked questions.
- Public documentation approved by the institution.

### Retrieval pipeline

```text
Document upload
  -> parse and clean
  -> split into semantic chunks
  -> attach subject, course, and access metadata
  -> create embeddings
  -> store vector index
  -> retrieve top-k chunks
  -> rerank relevant evidence
  -> generate answer with citations
  -> apply safety and scope checks
```

### Research questions

- Does metadata-aware retrieval outperform plain vector search?
- How does hybrid keyword plus vector retrieval perform for programming terms?
- Does reranking improve citation precision?
- What chunk size works best for practical manuals and code examples?
- Can the assistant refuse unsupported questions reliably?

### Metrics

- Recall@k and Precision@k for relevant source retrieval.
- Citation correctness.
- Answer groundedness.
- Unsupported-claim rate.
- Student usefulness rating.
- Hint-to-solution leakage rate.
- Latency and cost per answer.

### Guardrails

- Answer only from approved sources for course-specific questions.
- Show source references and document version.
- Refuse to reveal hidden assessment test cases.
- Avoid writing a complete solution when the student requested a hint.
- Do not expose another student’s code or feedback.
- Allow the student to report incorrect content.

## P1.2 Context-aware debugging assistant

### Goal

Explain compiler errors, runtime errors, SQL errors, and test-case failures using the student’s code and execution evidence.

### Input context

- Programming language and environment.
- Source code or relevant code region.
- Compiler or runtime error.
- Standard output and standard error.
- Exit code, runtime, memory, and timeout status.
- Problem statement and constraints.
- Previous attempts, if the student authorizes their use.

### Output format

The assistant should return structured output rather than only prose:

```json
{
  "error_category": "runtime_error",
  "explanation": "...",
  "evidence": ["stderr line ...", "function ..."],
  "hint": "...",
  "recommended_checks": ["..."],
  "confidence": 0.86,
  "complete_solution_included": false
}
```

### Research questions

- Can error classification combine deterministic rules with an LLM?
- Does compiler-aware retrieval improve debugging accuracy?
- How much context is needed to explain an error without leaking a solution?
- Can the model predict whether a suggested fix will compile in the sandbox?

### Acceptance rule

Any generated fix must be treated as a suggestion. The student can run it through the existing Docker execution system, which remains the final source of truth for compilation and runtime behavior.

## P1.3 Hint generation with solution leakage control

Provide progressive hints:

1. Restate the relevant concept.
2. Identify a likely incorrect assumption.
3. Suggest a debugging experiment.
4. Point toward an algorithmic pattern.
5. Reveal pseudocode only after explicit escalation.

Do not provide hidden assessment tests, answer keys, or another student’s implementation.

Measure:

- Hint usefulness.
- Number of successful resubmissions.
- Time to independent correction.
- Complete-solution leakage.
- Student dependence on hints.

---

# 7. P1 - Teacher Productivity

## P1.1 Feedback drafting assistant

### Goal

Generate a teacher-editable feedback draft for practical submissions.

### Evidence used

- Assignment rubric.
- Source code.
- Execution output.
- Test results where available.
- Student’s previous attempt.
- Teacher-approved feedback examples.

### Required behavior

- Separate observed facts from interpretation.
- Identify strengths before weaknesses.
- Reference exact code or output evidence.
- Suggest a learning action.
- Never assign final marks automatically.
- Require teacher approval before publication.

### Research evaluation

Use blinded teacher reviewers to score:

- Correctness.
- Specificity.
- Pedagogical usefulness.
- Fairness of language.
- Agreement with the rubric.
- Time saved after editing.

## P1.2 Submission error clustering

Cluster submissions by normalized failure patterns:

- Compilation errors.
- Null or bounds errors.
- Incorrect algorithm logic.
- Input parsing errors.
- SQL syntax or join errors.
- Timeout and memory failures.
- Environment or dependency issues.

Start with deterministic error signatures and embeddings only as a later comparison. Teachers should see cluster examples and counts, not an unexplained label.

### Research value

This can identify common misconceptions for a class and help teachers improve practical instructions. It is also a lower-risk AI problem because the raw compiler and execution evidence remains visible.

## P1.3 Rubric alignment assistant

Given a teacher-defined rubric, map observable evidence to rubric criteria:

```text
Rubric criterion -> evidence -> confidence -> teacher decision
```

For example, a rubric criterion such as “uses appropriate abstraction” should link to code structure evidence, not just a model-generated score.

---

# 8. P2 - Personalized Learning and Research Core

## P2.1 Knowledge tracing

### Goal

Estimate which concepts a student has mastered based on attempts, test-case outcomes, error categories, hints, time, and revisions.

### Candidate models

Begin with interpretable baselines:

- Bayesian Knowledge Tracing.
- Performance Factor Analysis.
- Item Response Theory.

Compare them with:

- Deep Knowledge Tracing.
- Transformer-based sequence models.
- Graph-based student-concept models.

### Concept model

Create a subject concept graph, for example:

```text
Arrays -> Searching -> Binary Search -> Invariants
Trees -> Traversal -> Recursion -> Complexity
SQL -> Joins -> Aggregation -> Indexing
Python -> Functions -> DataFrames -> Model Evaluation
```

### Output

The system should show:

- Concepts likely mastered.
- Concepts needing practice.
- Evidence supporting the estimate.
- Recommended next activity.
- Confidence and uncertainty.

Do not label a student permanently. Knowledge estimates must be time-dependent, explainable, and open to teacher correction.

## P2.2 Personalized recommendation engine

Recommend the next practical, concept explanation, example, or debugging exercise using:

- Current knowledge estimate.
- Prerequisite graph.
- Recent mistakes.
- Difficulty.
- Time available.
- Student goals.
- Teacher constraints.

Compare three baselines:

1. Teacher-defined sequence.
2. Rule-based prerequisite recommendation.
3. Machine-learning recommendation model.

Evaluate learning gain, not only clicks or time spent.

## P2.3 Adaptive practice generation

Generate additional practice tasks only from approved templates and concept constraints. A generated task must pass:

- Schema validation.
- Difficulty validation.
- Duplicate detection.
- Test-case generation.
- Deterministic execution.
- Teacher review for publication.

The model must never be allowed to publish an untested coding problem directly to students.

Research questions:

- Can generated exercises target a specific misconception?
- Are generated tasks equivalent in difficulty to teacher-authored tasks?
- Do generated examples improve transfer to new problems?

## P2.4 Code similarity and originality analysis

### Goal

Identify suspiciously similar submissions while avoiding unsupported accusations.

### Approach

Combine:

- Token normalization.
- Abstract syntax tree similarity.
- Control-flow or data-flow features.
- Code embeddings.
- Timing and submission-pattern signals only as secondary evidence.

The system should produce a review queue for teachers, not an automatic cheating verdict. Common template code and teacher-provided starter code must be excluded from similarity decisions.

Evaluate false positives carefully, especially for small assignments where correct solutions naturally look similar.

---

# 9. P2 - AI-Assisted Assessment Research

## P2.1 Explainable grading assistant

Use AI to summarize evidence for a teacher, while deterministic tests remain authoritative.

For practicals, the assistant may propose rubric evidence and feedback. For assessments, it may explain why test cases failed or identify likely edge cases.

It must not change the score without an explicit teacher action.

## P2.2 Semantic output comparison for selected subjects

Exact output comparison is appropriate for many assessments. Some domains have multiple valid outputs or floating-point variation. Research a layered comparator:

1. Exact comparison.
2. Whitespace and formatting normalization.
3. Numeric tolerance.
4. Structured SQL/table comparison.
5. Domain-specific semantic comparison.
6. Human review when confidence is low.

Every comparator should be deterministic, versioned, and tested against adversarial cases. An LLM should not be the only grader for correctness.

## P2.3 Program repair research

Explore automatic patch suggestions for compiler and test failures:

```text
failure -> candidate patch -> sandbox execution -> test result -> student choice
```

The patch is successful only if it compiles and passes the relevant tests. Research metrics include patch success rate, regression rate, edit distance, and learning impact.

This feature should be introduced after strong debugging data exists because unrestricted code generation can encourage copying rather than learning.

---

# 10. P3 - Advanced Research Directions

## P3.1 Multimodal notebook and artifact understanding

For ML, DL, and Data Science work, analyze:

- Notebook code cells.
- Markdown explanations.
- Plots and charts.
- Tables and metrics.
- Generated model artifacts.

Possible research questions:

- Can the system detect leakage between training and test data?
- Can it identify a misleading visualization?
- Can it check whether an experiment conclusion is supported by metrics?
- Can it connect notebook evidence to a rubric?

This requires strict handling of binary artifacts and careful validation of visual claims.

## P3.2 Causal learning analytics

Move beyond correlation. Study whether a type of feedback causes improvement in a later attempt.

Possible design:

- Randomize students to different feedback strategies when ethically and academically appropriate.
- Compare improvement on unseen tasks.
- Control for prior ability and assignment difficulty.
- Report confidence intervals and treatment effects.

Do not use observational correlations to claim that an AI feature caused learning improvement.

## P3.3 Federated or privacy-preserving learning

If multiple institutions contribute data, investigate:

- Federated learning.
- Differential privacy.
- Secure aggregation.
- Institution-specific model adapters.

The purpose is to learn general error patterns without centralizing raw student code. This is a long-term research direction and should follow a formal privacy review.

## P3.4 Knowledge graph for curriculum and code concepts

Build a graph connecting:

```text
subject -> topic -> concept -> prerequisite -> practical -> error -> feedback -> outcome
```

Use it for retrieval, explanations, recommendations, and analytics. Compare graph-based retrieval against vector-only retrieval.

## P3.5 Learning-oriented code review model

Develop a model that focuses on concepts and reasoning rather than style alone. It should identify:

- Correctness risks.
- Complexity concerns.
- Missing edge cases.
- Maintainability issues.
- Conceptual misunderstandings.

The model should produce evidence and questions that encourage the student to reason, not merely rewrite the code.

---

# 11. P4 - Ideas for Later

These ideas should not block the first AI release:

- Voice-based practical assistant.
- Conversational lab instructor.
- Automatic lecture or lab-note summarization.
- Cross-course skill passport.
- Institution-wide curriculum analytics.
- Synthetic student simulation for testing interventions.
- Reinforcement-learning tutor policies.
- Multi-agent teacher and student simulation.
- Autonomous assessment generation.

These require more data, safety testing, and institutional governance than the first releases.

---

# 12. Recommended First Research Project

## Title

**Evidence-Grounded AI Feedback for Programming Practical Submissions**

## Research problem

Can an AI assistant generate accurate, specific, and pedagogically useful feedback for student programming submissions when it is grounded in the practical rubric, source code, and sandbox execution evidence?

## Hypothesis

Evidence-grounded feedback will reduce teacher review time and improve feedback specificity without increasing incorrect or unfair comments compared with unguided model output.

## Inputs

- Practical statement.
- Rubric.
- Student source code.
- Compiler/runtime output.
- Test-case results.
- Previous submission, if permitted.

## Baselines

- Teacher-written feedback.
- Rule-based compiler-error explanations.
- Ungrounded large language model.
- Retrieval-augmented model.

## Outputs

- Evidence-backed strengths.
- One or more issues.
- Suggested next action.
- Confidence.
- References to code lines, output, or rubric criteria.

## Experimental design

1. Collect teacher-approved historical submissions and feedback.
2. Remove personal identifiers and split data by assignment and student.
3. Create training, validation, and held-out test sets without leakage.
4. Build a deterministic error baseline.
5. Build RAG with practical and rubric documents.
6. Add structured output and evidence requirements.
7. Have multiple teachers blindly rate feedback quality.
8. Measure teacher editing time and student improvement on a later task.
9. Analyze failure cases by subject, language, difficulty, and student group.

## Success criteria

A release candidate should meet predefined thresholds for:

- Factual correctness.
- Evidence citation accuracy.
- Rubric alignment.
- Teacher acceptance rate.
- Reduction in review time.
- Low harmful or misleading feedback rate.
- No unauthorized data exposure.

Do not choose thresholds after seeing the results. Register the evaluation plan first.

---

# 13. AI Architecture Proposal

```text
Client
  |
  v
API Gateway
  |
  v
AI Service
  |---- Policy and authorization layer
  |---- Prompt/model gateway
  |---- Retrieval service
  |---- Embedding service
  |---- Evaluation and audit store
  |
  +--> PostgreSQL: AI metadata, approvals, experiment records
  +--> Vector store: embeddings and metadata filters
  +--> MongoDB: model traces and non-sensitive debugging records
  +--> Redis: async AI jobs and rate limits
  +--> Existing services: submissions, assessments, execution, files
```

## Recommended model strategy

Use a model gateway so the provider can be changed without changing business services. Support:

- A hosted model for early experiments where policy permits.
- A self-hosted open-weight model for private deployments.
- Smaller classifier or embedding models for deterministic subproblems.
- Rule-based validators for safety-critical checks.

Never place provider-specific keys in source code. Store them in environment variables or a secret manager.

## Retrieval metadata

Every chunk should include:

```text
institution_id
subject_id
course_id
activity_id
document_id
document_version
access_scope
content_type
source_checksum
```

Retrieval must filter by authorization metadata before ranking. Similarity alone is not an access-control mechanism.

---

# 14. Dataset Plan

## Data sources

- Teacher-authored practical statements and rubrics.
- Approved course documents.
- Sanitized compiler and runtime errors.
- Student code with consent and de-identification.
- Submission outcomes and test-case results.
- Teacher feedback and edits.
- Student feedback on usefulness.
- Generated artifacts and notebook metadata.

## Annotation scheme

Annotate a representative sample with:

- Error category.
- Concept involved.
- Severity.
- Evidence location.
- Correctness of feedback.
- Pedagogical actionability.
- Difficulty.
- Whether a hint reveals too much.
- Fairness and accessibility concerns.

Use at least two reviewers for important labels and measure inter-rater agreement.

## Data splitting

Split by student and assignment, not random rows only. Otherwise, nearly identical attempts from one student or repeated versions of one assignment may leak across train and test sets.

Keep a final locked test set that is not used for prompt tuning.

---

# 15. Metrics by Feature

| Feature | Primary metrics | Safety metrics |
|---|---|---|
| RAG assistant | Recall@k, groundedness, citation accuracy | Unsupported claims, access leaks |
| Debugging assistant | Error classification F1, fix validation rate | Harmful fix rate, solution leakage |
| Hint generation | Learning gain, successful resubmission | Full-answer leakage, dependency |
| Feedback drafting | Teacher agreement, edit distance, time saved | Bias, incorrect criticism |
| Recommendations | Learning gain, completion, calibration | Disparate impact, overtracking |
| Knowledge tracing | AUC, calibration, longitudinal accuracy | Mislabeling, unfair intervention |
| Similarity analysis | Precision, recall, false-positive rate | Unsupported cheating accusation |
| Assessment support | Comparator accuracy, review rate | Incorrect score changes |

Also measure latency, cost, availability, and user satisfaction. A model that is accurate but too slow or expensive may not be suitable for classroom use.

---

# 16. Model and Prompt Evaluation

## Offline evaluation

- Use frozen datasets and fixed model versions.
- Compare against simple baselines.
- Test retrieval and generation separately.
- Include adversarial and out-of-scope prompts.
- Test prompt injection in uploaded documents and code comments.
- Test cross-tenant data leakage.
- Test hidden test-case and answer-key extraction attempts.

## Online evaluation

Use staged rollout:

1. Internal developer testing.
2. Teacher-only shadow mode.
3. Teacher approval mode.
4. Small opt-in student cohort.
5. Institution-wide rollout only after review.

Do not silently run uncontrolled experiments on students. Record feature flags, cohort assignment, and consent where required.

---

# 17. Security Threats Specific to AI

- Prompt injection inside practical documents, code, comments, or uploaded files.
- Retrieval of another institution’s documents.
- Leakage of hidden test cases or answer keys.
- Data exfiltration through model prompts or tool calls.
- Hallucinated grades or feedback.
- Model-generated insecure code suggestions.
- Bias in recommendations or similarity flags.
- Excessive logging of private student submissions.
- Denial of service through large prompts or repeated requests.
- Supply-chain risks in model files and third-party dependencies.

### Required controls

- Treat documents and code as untrusted input.
- Separate instructions from retrieved content.
- Use authorization filters before retrieval.
- Limit tools available to the model.
- Apply input size and request rate limits.
- Redact secrets and personal data.
- Log model and evidence versions.
- Require teacher approval for grades and public feedback.
- Provide kill switches and rollback.

---

# 18. Twelve-Month Priority Roadmap

## Phase 0: Months 1-2 - Foundation

- Define research questions and success metrics.
- Build the `ai-service` boundary.
- Add AI audit and model version tables.
- Create privacy, consent, and retention rules.
- Capture baseline teacher and student measurements.
- Build a small de-identified evaluation dataset.
- Add feature flags and rate limits.

## Phase 1: Months 3-4 - Grounded assistance

- Ingest approved practical and course documents.
- Implement metadata-filtered hybrid RAG.
- Add cited answers and refusal behavior.
- Build compiler/runtime error explanation.
- Add teacher-only evaluation screens.
- Test prompt injection and data isolation.

## Phase 2: Months 5-6 - Feedback and error intelligence

- Implement structured feedback drafts.
- Add error classification and clustering.
- Add evidence links to code, output, and rubric.
- Measure teacher acceptance and editing time.
- Keep all feedback behind teacher approval.

## Phase 3: Months 7-9 - Personalization research

- Define the subject concept graph.
- Implement rule-based recommendations as a baseline.
- Add knowledge tracing experiments.
- Recommend targeted practice.
- Evaluate learning outcomes on unseen tasks.

## Phase 4: Months 10-12 - Advanced research

- Study code similarity with AST and embedding baselines.
- Explore adaptive task generation with deterministic validation.
- Add notebook and artifact analysis experiments.
- Prepare a research paper or technical report.
- Conduct security, fairness, and production-readiness review.

---

# 19. Team Work Breakdown

### Backend engineer

- AI service APIs.
- Authorization and tenant isolation.
- Queue integration.
- Audit and experiment storage.
- Model gateway and observability.

### ML/NLP engineer

- Retrieval and embedding experiments.
- Error classification.
- Feedback and recommendation models.
- Evaluation pipelines.

### Data engineer

- Event and submission data pipeline.
- De-identification.
- Dataset versioning.
- Feature extraction and quality checks.

### Education/research lead

- Rubrics and annotation protocol.
- Learning-outcome design.
- Teacher and student studies.
- Bias and ethics review.

### Security engineer

- Prompt-injection testing.
- Data access review.
- Sandbox and secret protection.
- Threat modeling and incident response.

---

# 20. What to Present to the Company

Present the AI work as a measured research program, not as an unsupported chatbot feature:

1. The existing platform provides trusted execution and submission evidence.
2. The first AI release is grounded student support and teacher feedback assistance.
3. Every answer includes evidence, confidence, model version, and audit history.
4. Deterministic execution remains authoritative for code correctness.
5. Teachers remain in control of marks and published feedback.
6. Research is evaluated using baselines, held-out data, human review, and learning outcomes.
7. Advanced personalization and adaptive assessment follow only after reliable data is available.

## Suggested company demo sequence

1. Create or select a practical.
2. Ask a question answered from the practical document with citations.
3. Submit code with a compiler or runtime error.
4. Show an evidence-grounded debugging hint.
5. Show the student rerunning the code in the existing Docker sandbox.
6. Show a teacher reviewing an AI feedback draft.
7. Show the evidence, confidence, approval state, and audit record.
8. Show that final execution status and teacher approval remain authoritative.

## Suggested presentation statement

> We are extending the virtual laboratory with an evidence-grounded AI layer. The AI will use practical documents, rubrics, source code, and sandbox execution evidence to provide explainable hints and teacher-assistive feedback. We will evaluate it against rule-based and ungrounded baselines using held-out submissions, teacher review, leakage tests, fairness checks, and learning outcomes. Deterministic execution and teacher approval remain the final authority.

---

# 21. Final Recommendation

Start with **P0 foundation**, then build **P1 grounded debugging and teacher feedback**. These features create immediate value, use data already produced by the platform, and are researchable without giving an AI model uncontrolled authority over grades.

The first publication-quality direction should be:

> Evidence-Grounded, Learning-Oriented Feedback for Programming Practicals using Source Code, Execution Traces, and Rubrics.

This direction is specific enough to evaluate, useful enough to demonstrate to a company, and extensible toward personalization, adaptive practice, and intelligent assessment.
