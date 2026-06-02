#!/bin/bash
# run_isolated.sh
# Usage: ./run_isolated.sh <command> <args...>

# Memory limit (ulimit -v) in KB. 512MB = 524288
ulimit -v 524288

# Process/Thread limit (ulimit -u). Prevent fork bombs.
# 64 should be enough for a JVM to spin up, or a C++/Python process.
ulimit -u 64

# File size limit (ulimit -f) in blocks (1 block = 512 bytes). 10MB = 20480
# Prevents massive file creation
ulimit -f 20480

exec "$@"
