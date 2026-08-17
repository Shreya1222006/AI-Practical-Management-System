# PostgreSQL DBMS Execution Environment (DBMS Practicals)
# Slug: postgres-dbms
# Tag: vpl-postgres-runner:1.0

FROM postgres:16-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install Python 3 and psycopg2 for SQL runner sidecar
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-psycopg2 \
    python3-pip \
    coreutils \
    bash \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY sql-runner.py /usr/local/bin/sql-runner.py
COPY run.sh /usr/local/bin/run.sh

RUN chmod +x /usr/local/bin/sql-runner.py /usr/local/bin/run.sh \
    && chown -R postgres:postgres /workspace

# Use postgres user for running ephemeral database
USER postgres

ENTRYPOINT ["/usr/local/bin/run.sh"]
