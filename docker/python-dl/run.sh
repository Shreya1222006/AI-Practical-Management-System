#!/bin/bash
set -e

ENTRY_FILE="${ENTRY_FILE:-}"

# Auto-detect script or notebook to execute
if [ -n "$ENTRY_FILE" ] && [ -f "$ENTRY_FILE" ]; then
    TARGET="$ENTRY_FILE"
elif [ -f "train.py" ]; then
    TARGET="train.py"
elif [ -f "main.py" ]; then
    TARGET="main.py"
elif [ -f "notebook.ipynb" ]; then
    TARGET="notebook.ipynb"
else
    # Find first .py or .ipynb file in /workspace
    TARGET=$(find . -maxdepth 1 -name "*.py" -o -name "*.ipynb" | head -n 1)
fi

if [ -z "$TARGET" ]; then
    echo "Error: No Python script (.py) or Jupyter notebook (.ipynb) found in /workspace" >&2
    exit 1
fi

# Execute notebook or script
if [[ "$TARGET" == *.ipynb ]]; then
    jupyter nbconvert --to notebook --execute "$TARGET" --output "executed_notebook.ipynb" --ExecutePreprocessor.timeout=600
elif [ -f "input.txt" ]; then
    python3 "$TARGET" < input.txt
else
    python3 "$TARGET"
fi
