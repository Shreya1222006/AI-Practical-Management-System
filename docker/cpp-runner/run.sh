#!/bin/bash
set -e

# Default source and output binaries
SOURCE_FILE="${SOURCE_FILE:-main.cpp}"
OUTPUT_BIN="/tmp/main_bin"

# If a Makefile exists, use make
if [ -f "Makefile" ]; then
    make
    if [ -f "./main" ]; then
        OUTPUT_BIN="./main"
    fi
elif [ -f "main.c" ] && [ "$SOURCE_FILE" = "main.c" ]; then
    gcc -std=c17 -O2 -pthread main.c -o "$OUTPUT_BIN" -lm
elif [ -f "$SOURCE_FILE" ]; then
    g++ -std=c++17 -O2 -pthread "$SOURCE_FILE" -o "$OUTPUT_BIN"
else
    echo "Error: No source file ($SOURCE_FILE) or Makefile found in /workspace" >&2
    exit 1
fi

# Run binary with stdin if input.txt exists
if [ -f "input.txt" ]; then
    "$OUTPUT_BIN" < input.txt
else
    "$OUTPUT_BIN"
fi
