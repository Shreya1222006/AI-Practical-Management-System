# C/C++ Execution Environment (DSA, OOP, OS)
# Slug: cpp-gcc
# Tag: vpl-cpp-runner:1.0

FROM debian:bookworm-slim

# Avoid prompts from debconf
ENV DEBIAN_FRONTEND=noninteractive

# Install GCC, G++, Make, Pthread support, Coreutils, and Bash
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    libc6-dev \
    coreutils \
    bash \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root sandbox runner user
RUN useradd -m -u 1000 runner

WORKDIR /workspace

COPY run.sh /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/run.sh

USER runner

ENTRYPOINT ["/usr/local/bin/run.sh"]
