#!/usr/bin/env bash
# Dispatch a task brief to Codex non-interactively.
# Usage: orchestration/run-task.sh orchestration/tasks/001-scaffold.md [effort: low|medium|high|xhigh]
set -euo pipefail
cd "$(dirname "$0")/.."
brief="$1"; effort="${2:-high}"
name="$(basename "$brief" .md)"
mkdir -p orchestration/logs
export npm_config_cache="$PWD/.npm-cache"
codex exec -s workspace-write \
  -c model_reasoning_effort="$effort" \
  -c sandbox_workspace_write.network_access=true \
  -o "orchestration/logs/$name.last.md" \
  "Read AGENTS.md and orchestration/PROJECT.md, then complete the task in $brief. Write your report to orchestration/reports/$name.md as AGENTS.md describes." \
  > "orchestration/logs/$name.log" 2>&1
echo "codex finished $name (exit $?)"
