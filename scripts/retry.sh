#!/usr/bin/env bash
# Ruling 217: a gating step that reaches a third party retries, because a gate that goes red for
# an unrelated reason trains people to look past red. Used for the two fetches the matrix cannot
# avoid and does not test: the package install and the browser download.
#
# This is not an auto-retry of a test (ruling 206 forbids that). It retries fetching the things a
# test needs before any test body runs, and a failure after the last attempt is still hard red.
#
# Usage: scripts/retry.sh <attempts> <command> [args...]
set -uo pipefail

attempts="${1:?attempts is required}"
shift
[ "$#" -gt 0 ] || { echo "::error::scripts/retry.sh needs a command"; exit 2; }

delay=5
status=1
for ((i = 1; i <= attempts; i++)); do
  # Not `if "$@"; then`: an if whose condition fails leaves $? at zero, and a retry helper that
  # reports success after every attempt failed is a gate that can never go red.
  status=0
  "$@" || status=$?
  if [ "$status" -eq 0 ]; then
    [ "$i" -gt 1 ] && echo "Succeeded on attempt $i of $attempts."
    exit 0
  fi
  if [ "$i" -lt "$attempts" ]; then
    echo "::notice::Attempt $i of $attempts failed (exit $status). Retrying in ${delay}s: $*"
    sleep "$delay"
    delay=$((delay * 2))
  fi
done
echo "::error::All $attempts attempts failed (exit $status): $*"
exit "$status"
