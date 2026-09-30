#!/usr/bin/env bash
# Ruling 217: a gating step that reaches a third party retries, because a gate that goes red for
# an unrelated reason trains people to look past red. Used for the two fetches the matrix cannot
# avoid and does not test: the package install and the browser download.
#
# This is not an auto-retry of a test (ruling 206 forbids that). It retries fetching the things a
# test needs before any test body runs, and a failure after the last attempt is still hard red.
#
# Handoff 38-C (G196): RETRY_ATTEMPT_SECONDS=<n> bounds each attempt. Without a bound an attempt
# that stalls never ends, so nothing here ever gets to retry it and the stall spends the job's
# whole budget: on pages.yml run 439 the apt archive fetch inside `playwright install --with-deps`
# ran 31m47s at 67.9 kB/s, inside the WebKit matrix job's 60 minutes, and the suite was cut with
# no check failed. With the bound each attempt runs under coreutils `timeout`, is sent TERM at n
# seconds and KILL 20 seconds later, and is named as timed out; the next attempt then starts. When
# the bound is set and `timeout` is not on PATH the script refuses by name rather than running
# unbounded, because a bound that silently did not apply is the unbounded step again (485, 539).
#
# Usage: [RETRY_ATTEMPT_SECONDS=<n>] scripts/retry.sh <attempts> <command> [args...]
set -uo pipefail

attempts="${1:?attempts is required}"
shift
[ "$#" -gt 0 ] || { echo "::error::scripts/retry.sh needs a command"; exit 2; }

bound="${RETRY_ATTEMPT_SECONDS:-}"
if [ -n "$bound" ]; then
  case "$bound" in
    *[!0-9]*|'') echo "::error::RETRY_ATTEMPT_SECONDS must be a whole number of seconds, not '$bound'"; exit 2 ;;
  esac
  if ! command -v timeout >/dev/null 2>&1; then
    echo "::error::RETRY_ATTEMPT_SECONDS=$bound is set but 'timeout' is not on PATH, so no attempt can be bounded: $*"
    exit 2
  fi
fi

# Under the bound, `timeout` puts the command in its own process group and signals the whole group,
# so a browser download spawned two levels down ends with the attempt. What the command ran through
# sudo does not: sudo runs it in a pty session of its own, outside that group, and on pages.yml run
# 441 the apt-get a cut attempt started outlived it and held the dpkg lock against the retry. The
# caller that runs root work ends it at the start of its next attempt, as pages.yml's install step
# does; this script has no sudo and takes none. Exit 124 is the TERM at the bound; 137 is the KILL
# twenty seconds later, when TERM was not enough.
attempt() {
  if [ -n "$bound" ]; then
    timeout --kill-after=20 "$bound" "$@"
  else
    "$@"
  fi
}

timed_out() {
  [ -n "$bound" ] && { [ "$1" -eq 124 ] || [ "$1" -eq 137 ]; }
}

delay=5
status=1
for ((i = 1; i <= attempts; i++)); do
  # Not `if "$@"; then`: an if whose condition fails leaves $? at zero, and a retry helper that
  # reports success after every attempt failed is a gate that can never go red.
  status=0
  attempt "$@" || status=$?
  if [ "$status" -eq 0 ]; then
    [ "$i" -gt 1 ] && echo "Succeeded on attempt $i of $attempts."
    exit 0
  fi
  if timed_out "$status"; then
    why="timed out at the ${bound}s bound (exit $status)"
  else
    why="failed (exit $status)"
  fi
  if [ "$i" -lt "$attempts" ]; then
    echo "::notice::Attempt $i of $attempts $why. Retrying in ${delay}s: $*"
    sleep "$delay"
    delay=$((delay * 2))
  fi
done
if timed_out "$status"; then
  echo "::error::All $attempts attempts timed out at the ${bound}s bound (exit $status): $*"
else
  echo "::error::All $attempts attempts failed (exit $status): $*"
fi
exit "$status"
