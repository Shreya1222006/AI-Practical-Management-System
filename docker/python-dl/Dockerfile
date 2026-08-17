# Python, Machine Learning & Deep Learning Execution Environment
# Slug: python-dl (also covers python-dsa, jupyter-ml, jupyter-ds, jupyter-dl)
# Tag: vpl-python-dl:1.0

FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV MPLCONFIGDIR=/tmp/matplotlib

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    coreutils \
    bash \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python requirements
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Create runner user & temp cache directory
RUN useradd -m -u 1000 runner \
    && mkdir -p /tmp/matplotlib \
    && chown -R runner:runner /tmp/matplotlib /workspace

COPY run.sh /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/run.sh

USER runner

ENTRYPOINT ["/usr/local/bin/run.sh"]
