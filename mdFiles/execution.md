# Execution Environments Reference

> **Purpose:** Define what runtime each subject needs, how Docker images bundle components, and what we ship in **Phase 1** vs later phases.
>
> **Related:** [entities.md](./entities.md) · [evaluation.md](./evaluation.md) · [README.md](./README.md)

---

## Table of Contents

1. [How slug vs components works](#1-how-slug-vs-components-works)
2. [Is the current schema sufficient?](#2-is-the-current-schema-sufficient)
3. [Subject-wise environment research](#3-subject-wise-environment-research)
4. [Environment catalog (all slugs)](#4-environment-catalog-all-slugs)
5. [Phase 1 delivery plan](#5-phase-1-delivery-plan)
6. [Schema enhancement](#6-schema-enhancement)
7. [Docker image structure](#7-docker-image-structure)

---

## 1. How slug vs components works

### One slug ≠ one tool

| Concept | Meaning |
|---------|---------|
| **`slug`** | One **pre-built Docker image** registered in the platform (e.g. `jupyter-ml`) |
| **Components** | All tools **inside** that image: Python, Jupyter, scikit-learn, pandas, … |
| **Practical → environment** | Each practical links to **one** `environment_id` (one slug) |

ML does **not** need three slugs (`jupyter`, `python`, `scikit-learn`). It needs **one slug** whose Docker image **already contains** all of them.

```
Student opens ML practical
    → practical.environment_id → slug: jupyter-ml
    → Orchestrator runs container from image: vpl-jupyter-ml:1.0
    → Inside container: Python 3.11 + JupyterLab + scikit-learn + pandas + …
```

### When to use multiple slugs

Use **separate slugs** only when the **runtime is fundamentally different** (different base OS, compiler vs notebook server, SQL engine vs Python):

| Separate slug needed | Reason |
|---------------------|--------|
| `cpp-gcc` vs `jupyter-ml` | Compiler execution vs notebook server |
| `postgres-dbms` vs `python-dsa` | Database daemon + SQL runner vs script interpreter |
| `python-dsa` vs `cpp-gcc` | Same subject (DSA) but different languages per syllabus |

Do **not** create one slug per pip package.

---

## 2. Is the current schema sufficient?

### Current `execution_environments` table

```sql
slug, docker_image, language, subjects[], supports_notebook, ...
```

**Sufficient for execution** — one row per Docker image is correct.

**Not sufficient for documentation** — it does not list what is installed inside the image (Jupyter, scikit-learn, GCC version, etc.).

### Recommended addition

Add a **`components` JSONB** column (see [Section 6](#6-schema-enhancement)):

```json
{
  "runtime": { "python": "3.11.9", "gcc": "13.2.0" },
  "tools": ["jupyterlab", "ipython"],
  "libraries": ["numpy", "pandas", "scikit-learn"],
  "services": ["postgresql-16"],
  "phase": 1
}
```

Optionally a child table `environment_components` for admin UI versioning — JSONB is enough for Phase 1.

---

## 3. Subject-wise environment research

Based on SPPU / Indian CE lab syllabi and common lab infrastructure.

### 3.1 DSA — Data Structures & Algorithms

| Aspect | Requirement |
|--------|-------------|
| **Languages** | **Python** (Groups A/B — lists as arrays, no built-in set/sort) + **C++** (Groups C/D/E — linked lists, trees, graphs) |
| **OS** | 64-bit Linux |
| **Compiler / runtime** | GCC/G++ 13+, Python 3.11+ |
| **Libraries** | Python stdlib only (syllabus restricts built-ins for core logic) |
| **Editor** | Single-file or multi-file C++; `.py` scripts |
| **Execution** | Compile → run with stdin OR interactive menu |
| **Typical limits** | 30s CPU, 512 MB RAM |
| **Not required** | Jupyter, database, GPU |

**→ Two environments:** `python-dsa`, `cpp-gcc`

---

### 3.2 OOP — Object-Oriented Programming

| Aspect | Requirement |
|--------|-------------|
| **Languages** | **C++** (primary in SPPU CE), Java in some colleges |
| **Features needed** | g++, multi-file compile, classes, inheritance demos |
| **Libraries** | STL only for Phase 1 |
| **Execution** | Menu-driven apps, object state printing |
| **Optional (Phase 2)** | OpenGL/CG combined labs — separate `cpp-opengl` slug |
| **Typical limits** | 30s, 512 MB |

**→ Phase 1 environment:** `cpp-gcc` (shared with DSA/OS)  
**→ Phase 2 optional:** `java-jdk17` for Java OOP colleges

---

### 3.3 OS — Operating Systems & Systems Programming

| Aspect | Requirement |
|--------|-------------|
| **Languages** | **C/C++** |
| **System features** | `pthreads` (scheduling, producer-consumer), standard POSIX |
| **Special labs** | Two-pass assembler, LEX/YACC — need `flex`, `bison`, `gcc` |
| **Execution** | Simulators print tables (FCFS, page replacement); no real kernel |
| **Libraries** | pthread, stdio, stdlib |
| **Typical limits** | 30–60s, 512 MB–1 GB |
| **Not required** | GPU, Jupyter |

**→ Phase 1:** `cpp-gcc` with pthread + build tools  
**→ Phase 2:** `cpp-lex-yacc` (flex/bison) for systems programming assignments

---

### 3.4 DBMS — Database Management Systems

| Aspect | Requirement |
|--------|-------------|
| **Primary RDBMS** | **PostgreSQL** (recommended) or MySQL — syllabus lists both |
| **Work types** | DDL, DML, JOINs, subqueries, views, indexes |
| **PL/SQL** | Oracle-style blocks — PostgreSQL uses **PL/pgSQL** (Phase 2) |
| **NoSQL** | **MongoDB** for CRUD labs (Group B/C in syllabus) |
| **Front-end connectivity** | Python/Java + JDBC (Phase 2 — mini project) |
| **Execution** | Run SQL → return **result grid** (not stdout string) |
| **Pre-seeded data** | Schema + sample rows mounted per practical |
| **Typical limits** | 60s, 1 GB (DB startup overhead) |

**→ Phase 1:** `postgres-dbms`  
**→ Phase 2:** `mongodb-dbms`, `postgres-plpgsql`

---

### 3.5 ML — Machine Learning

| Aspect | Requirement |
|--------|-------------|
| **Language** | **Python 3.11** |
| **Interface** | **Jupyter Notebook / JupyterLab** (syllabus: Jupyter, Spyder, Pycharm — browser platform uses Jupyter) |
| **Core libraries** | **NumPy**, **Pandas**, **scikit-learn**, **Matplotlib**, **Seaborn** |
| **Optional (Phase 2)** | XGBoost, imbalanced-learn, NLTK (if NLP crossover) |
| **Data** | CSV datasets mounted read-only (`iris.csv`, Boston housing, Social_Network_Ads.csv) |
| **Output** | Metrics in stdout + plots as PNG + notebook with cell outputs |
| **Typical limits** | 5–10 min, 2 GB RAM |
| **Not required (Phase 1)** | GPU, TensorFlow, PyTorch |

**→ One slug bundles everything:** `jupyter-ml`  
Contains: Python + JupyterLab + NumPy + Pandas + scikit-learn + Matplotlib + Seaborn

---

### 3.6 DL — Deep Learning

| Aspect | Requirement |
|--------|-------------|
| **Language** | **Python 3.11** |
| **Interface** | **JupyterLab** |
| **Frameworks** | **TensorFlow 2.x** and/or **PyTorch 2.x** (syllabus/colleges vary) |
| **Supporting libs** | NumPy, Pandas, Matplotlib, **Keras** (via TF), torchvision |
| **Datasets** | MNIST, CIFAR-10 (bundled or mounted) |
| **Output** | Training logs, accuracy, loss plots, saved `.h5` / `.pt` models |
| **Typical limits** | 10–15 min, 4 GB RAM |
| **Phase 3 optional** | GPU (`nvidia-runtime`) |

**→ One slug:** `jupyter-dl`  
Contains: Python + JupyterLab + TensorFlow + PyTorch + NumPy + Pandas + Matplotlib  
*(Large image — separate from ML to keep ML container smaller/faster)*

---

### 3.7 DS — Data Science & Analytics

| Aspect | Requirement |
|--------|-------------|
| **Language** | **Python 3.11** (also Java/Scala for Hadoop/Spark in advanced groups) |
| **Interface** | **JupyterLab** |
| **Core libraries** | **Pandas**, **NumPy**, **Matplotlib**, **Seaborn**, basic **scikit-learn** (regression/classification labs) |
| **Phase 2** | Apache Spark (PySpark), Hadoop streaming |
| **Data** | Titanic, Iris, Kaggle CSVs, open government data |
| **Output** | DataFrames printed, statistical summaries, charts, written observations in notebook |
| **Typical limits** | 5–10 min, 2 GB RAM |

**→ Phase 1 slug:** `jupyter-ds` (lighter than ML — no heavy DL frameworks)  
**→ Phase 2 slug:** `pyspark-ds` for Big Data assignments

---

### Subject → environment mapping (summary)

| Subject | Primary Slug | Docker Image | Covers / Shared with |
|---------|--------------|--------------|----------------------|
| **DSA** | `cpp-gcc` / `python-dl` | `vpl-cpp-runner:1.0` / `vpl-python-dl:1.0` | C++ groups & Python groups |
| **OOP** | `cpp-gcc` | `vpl-cpp-runner:1.0` | DSA (C++), OS |
| **OS** | `cpp-gcc` | `vpl-cpp-runner:1.0` | DSA (C++), OOP |
| **DBMS** | `postgres-dbms` | `vpl-postgres-runner:1.0` | PostgreSQL DDL/DML & SQL queries |
| **ML** | `python-dl` | `vpl-python-dl:1.0` | Python + Scikit-Learn + Matplotlib + Seaborn |
| **DL** | `python-dl` | `vpl-python-dl:1.0` | PyTorch + Torchvision + Deep Learning stack |
| **DS** | `python-dl` | `vpl-python-dl:1.0` | Pandas + NumPy + Matplotlib + Seaborn |

---

## 4. Environment catalog (all slugs)

### 4.1 `cpp-gcc` — C/C++ (DSA advanced, OOP, OS)

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-cpp-runner:1.0` |
| **Subjects** | DSA (C++ groups), OOP, OS |
| **Base OS** | Debian bookworm-slim |
| **Phase** | **1** |

**Components provided:**

| Component | Version (Phase 1) | Purpose |
|-----------|-------------------|---------|
| GCC | 13.x | C compilation |
| G++ | 13.x | C++ compilation |
| make | 4.x | Multi-file build |
| pthread | libc | OS threading labs |
| bash | 5.x | Run script wrapper |
| coreutils | — | stdin/stdout harness |

**Phase 2 additions:** `flex`, `bison` (LEX/YACC labs), `gdb` (debug output capture)

**Run command template:**

```bash
g++ -std=c++17 -O2 -pthread main.cpp -o /tmp/main && /tmp/main
```

**Resource defaults:** 30s timeout · 512 MB RAM · 1 CPU · network disabled

---

### 4.2 `python-dsa` — Python (DSA Groups A/B)

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-python-dsa:1.0` |
| **Subjects** | DSA (Python groups) |
| **Phase** | **1** |

**Components provided:**

| Component | Version (Phase 1) | Purpose |
|-----------|-------------------|---------|
| Python | 3.11 | Script execution |
| pip | latest | — |
| *(stdlib only)* | — | Syllabus avoids numpy/pandas for basic DSA |

**Phase 2 additions:** None required (keep minimal per syllabus)

**Run command template:**

```bash
python3 /workspace/main.py
```

**Resource defaults:** 30s · 512 MB · 1 CPU

---

### 4.3 `postgres-dbms` — PostgreSQL (DBMS)

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-postgres-runner:1.0` |
| **Subjects** | DBMS |
| **Phase** | **1** |

**Components provided:**

| Component | Version (Phase 1) | Purpose |
|-----------|-------------------|---------|
| PostgreSQL | 16 | SQL engine |
| psql | 16 | CLI runner |
| Python | 3.11 | SQL runner sidecar script |
| psycopg2 | 2.9 | Execute query → JSON result grid |

**Phase 2 additions:** PL/pgSQL procedural blocks, MongoDB sidecar (`mongodb-dbms` as **separate slug**)

**Execution flow:**

```
1. Start PostgreSQL in container (pre-seeded schema from practical mount)
2. Student SQL → runner script executes → returns JSON {columns, rows}
3. Display result grid in UI
```

**Resource defaults:** 60s · 1 GB · 1 CPU

---

### 4.4 `jupyter-ml` — Machine Learning

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-jupyter-ml:1.0` |
| **Subjects** | ML |
| **Phase** | **1** |

**Components provided (all inside ONE image):**

| Component | Version (Phase 1) | Purpose |
|-----------|-------------------|---------|
| Python | 3.11 | Runtime |
| JupyterLab | 4.x | Notebook UI + execution |
| IPython | 8.x | Kernel |
| NumPy | 1.26.x | Arrays |
| Pandas | 2.x | DataFrames |
| scikit-learn | 1.4.x | ML models (LR, SVM, NB, k-NN) |
| Matplotlib | 3.8.x | Plotting |
| Seaborn | 0.13.x | Statistical plots |
| SciPy | 1.12.x | Stats helpers |

**Phase 2 additions:** XGBoost, imbalanced-learn, NLTK (optional)

**Not in Phase 1:** TensorFlow, PyTorch (those are in `jupyter-dl`)

**Execution modes:**

| Mode | Description |
|------|-------------|
| `.py` script | `python3 script.py` — metrics to stdout |
| `.ipynb` notebook | `jupyter execute notebook.ipynb` — capture outputs + artifacts |

**Resource defaults:** 600s (10 min) · 2 GB · 2 CPU

---

### 4.5 `jupyter-dl` — Deep Learning

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-jupyter-dl:1.0` |
| **Subjects** | DL |
| **Phase** | **2** |

**Components provided:**

| Component | Version (Phase 2) | Purpose |
|-----------|-------------------|---------|
| Python | 3.11 | Runtime |
| JupyterLab | 4.x | Notebook UI |
| NumPy | 1.26.x | — |
| Pandas | 2.x | Data loading |
| Matplotlib | 3.8.x | Training curves |
| TensorFlow | 2.15.x | CNNs, Keras API |
| Keras | (bundled TF) | High-level DL |
| PyTorch | 2.2.x | Alternative framework labs |
| torchvision | 0.17.x | Image datasets |

**Phase 3 additions:** GPU support (`--gpus`), CUDA 12.x

**Resource defaults:** 900s (15 min) · 4 GB · 2 CPU (CPU-only training in Phase 2)

---

### 4.6 `jupyter-ds` — Data Science

| Field | Value |
|-------|-------|
| **Docker image** | `vpl-jupyter-ds:1.0` |
| **Subjects** | DS |
| **Phase** | **2** |

**Components provided:**

| Component | Version (Phase 2) | Purpose |
|-----------|-------------------|---------|
| Python | 3.11 | Runtime |
| JupyterLab | 4.x | Notebook UI |
| NumPy | 1.26.x | — |
| Pandas | 2.x | Wrangling, describe(), groupby |
| Matplotlib | 3.8.x | Histograms, plots |
| Seaborn | 0.13.x | Titanic-style visualizations |
| scikit-learn | 1.4.x | Basic analytics labs (LR, clustering) |

**Phase 3 additions:** PySpark 3.5 (`pyspark-ds` slug for Hadoop/Spark assignments)

**Resource defaults:** 600s · 2 GB · 2 CPU

---

### 4.7 Future slugs (not Phase 1)

| Slug | Subjects | When |
|------|----------|------|
| `java-jdk17` | OOP (Java colleges) | Phase 2 |
| `cpp-lex-yacc` | OS (systems programming) | Phase 2 |
| `mongodb-dbms` | DBMS (NoSQL labs) | Phase 2 |
| `pyspark-ds` | DS (Big Data Group B) | Phase 3 |

---

## 5. Phase 1 delivery plan
 
What we **build and ship first** (Consolidated into 3 core environments):
 
| Priority | Slug | Docker Image | Subjects covered | Image size (est.) |
|----------|------|--------------|------------------|-------------------|
| **P0** | `cpp-gcc` | `vpl-cpp-runner:1.0` | DSA (C++), OOP, OS | ~300 MB |
| **P0** | `python-dl` | `vpl-python-dl:1.0` | DSA (Python), ML, DL, DS | ~1.8 GB |
| **P0** | `postgres-dbms` | `vpl-postgres-runner:1.0` | DBMS | ~400 MB |
 
### Phase 1 component checklist
 
```
cpp-gcc        →  g++, gcc, make, pthread, bash, coreutils
python-dl      →  python3 (3.11), torch, torchvision, numpy, pandas, scikit-learn,
                   matplotlib, seaborn, scipy, nbconvert, ipython
postgres-dbms  →  postgresql-16, psql, python3, psycopg2, sql-runner
```
 
---
 
## 6. Schema enhancement
 
### Updated `execution_environments` (add `components` JSONB)
 
```sql
ALTER TABLE execution_environments
  ADD COLUMN components JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN phase SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN image_size_mb INT,
  ADD COLUMN description TEXT;
 
-- Example seed: python-dl
INSERT INTO execution_environments (
  name, slug, docker_image, language, subjects,
  supports_notebook, default_time_limit_sec, default_memory_limit_mb,
  phase, components
) VALUES (
  'Python, ML & Deep Learning Stack',
  'python-dl',
  'vpl-python-dl:1.0',
  'python',
  ARRAY['DSA', 'ML', 'DL', 'DS'],
  TRUE,
  60,
  2048,
  1,
  '{
    "runtime": {"python": "3.11"},
    "tools": ["python3", "pip", "ipython", "nbconvert"],
    "libraries": [
      {"name": "torch", "version": "2.2", "phase": 1},
      {"name": "torchvision", "version": "0.17", "phase": 1},
      {"name": "scikit-learn", "version": "1.4", "phase": 1},
      {"name": "numpy", "version": "1.26", "phase": 1},
      {"name": "pandas", "version": "2.2", "phase": 1},
      {"name": "matplotlib", "version": "3.8", "phase": 1},
      {"name": "seaborn", "version": "0.13", "phase": 1},
      {"name": "scipy", "version": "1.12", "phase": 1}
    ],
    "services": [],
    "compilers": []
  }'::jsonb
);
```
 
### Optional: `environment_components` table (admin UI / versioning)
 
Use if you need queryable component lists across environments:
 
```sql
CREATE TABLE environment_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id  UUID NOT NULL REFERENCES execution_environments(id) ON DELETE CASCADE,
  component_type  VARCHAR(30) NOT NULL,  -- runtime | tool | library | service | compiler
  name            VARCHAR(100) NOT NULL,
  version         VARCHAR(50),
  phase           SMALLINT NOT NULL DEFAULT 1,
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
 
  UNIQUE (environment_id, component_type, name)
);
```
 
**Recommendation:** Start with **`components` JSONB** on `execution_environments`. Add `environment_components` table only when admin UI needs to filter/search by library.
 
---
 
## 7. Docker image structure
 
```
docker/
├── cpp-runner/              → vpl-cpp-runner:1.0      (slug: cpp-gcc)
│   ├── Dockerfile
│   └── run.sh
├── python-dl/               → vpl-python-dl:1.0       (slug: python-dl)
│   ├── Dockerfile
│   ├── requirements.txt     ← torch, torchvision, numpy, pandas, scikit-learn, matplotlib, …
│   └── run.sh
└── postgres-runner/         → vpl-postgres-runner:1.0 (slug: postgres-dbms)
    ├── Dockerfile
    ├── init-db.sh
    ├── sql-runner.py
    └── run.sh
```
 
### `python-dl` Dockerfile sketch (shows bundled components)
 
```dockerfile
FROM python:3.11-slim-bookworm
 
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
 
WORKDIR /workspace
COPY run.sh /usr/local/bin/
USER 1000:1000
```
 
One consolidated image → one slug → all Python, DSA, ML, and DL components available together.

One image → one slug → all ML components available together.

---

## Quick answers

| Question | Answer |
|----------|--------|
| Does one slug support multiple tools (Jupyter + Python + sklearn)? | **Yes** — they live inside one Docker image per slug |
| Do we need slug `python`, slug `jupyter`, slug `sklearn` separately? | **No** — use one `jupyter-ml` slug |
| Is original schema enough? | **Yes for running code**; add `components` JSONB to document what's inside |
| Which env for ML in Phase 1? | **`jupyter-ml`** with Python 3.11 + JupyterLab + NumPy + Pandas + scikit-learn + Matplotlib + Seaborn + SciPy |

---

*Last updated: August 2026*
