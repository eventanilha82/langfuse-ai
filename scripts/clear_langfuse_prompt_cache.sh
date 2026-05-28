#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_ENV_FILE="${APP_ENV_FILE:-.env}"
LANGFUSE_ENV_FILE="${LANGFUSE_ENV_FILE:-langfuse.env}"
LANGFUSE_COMPOSE="${LANGFUSE_COMPOSE:-docker-compose.yml}"
DOCKER_COMPOSE="${DOCKER_COMPOSE:-docker-compose}"
REDIS_SERVICE="${REDIS_SERVICE:-redis}"
DRY_RUN="${DRY_RUN:-false}"
PROMPT_CACHE_PATTERN="${PROMPT_CACHE_PATTERN:-}"

read_env_value() {
  local file="$1"
  local key="$2"
  local default_value="${3:-}"

  if [ ! -f "$file" ]; then
    printf '%s\n' "$default_value"
    return
  fi

  local value
  value="$(
    awk -F= -v key="$key" '
      $0 !~ /^[[:space:]]*#/ && $1 == key {
        sub(/^[^=]*=/, "")
        print
        exit
      }
    ' "$file"
  )"

  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s\n' "${value:-$default_value}"
}

PROMPT_NAME="${PROMPT_NAME:-$(read_env_value "$APP_ENV_FILE" LANGFUSE_PROMPT_NAME "")}"
if [ -z "$PROMPT_NAME" ]; then
  PROMPT_NAME="$(read_env_value ".env.example" LANGFUSE_PROMPT_NAME "oracle-ai-lab-assistant")"
fi

PROMPT_LABEL="${PROMPT_LABEL:-$(read_env_value "$APP_ENV_FILE" LANGFUSE_PROMPT_LABEL "")}"
if [ -z "$PROMPT_LABEL" ]; then
  PROMPT_LABEL="$(read_env_value ".env.example" LANGFUSE_PROMPT_LABEL "production")"
fi

REDIS_AUTH="${REDIS_AUTH:-$(read_env_value "$LANGFUSE_ENV_FILE" REDIS_AUTH "myredissecret")}"

redis_cli() {
  if [ -n "$REDIS_AUTH" ]; then
    "$DOCKER_COMPOSE" --env-file "$LANGFUSE_ENV_FILE" -f "$LANGFUSE_COMPOSE" \
      exec -T "$REDIS_SERVICE" redis-cli -a "$REDIS_AUTH" --no-auth-warning "$@"
  else
    "$DOCKER_COMPOSE" --env-file "$LANGFUSE_ENV_FILE" -f "$LANGFUSE_COMPOSE" \
      exec -T "$REDIS_SERVICE" redis-cli "$@"
  fi
}

tmp_candidates="$(mktemp)"
tmp_matches="$(mktemp)"
trap 'rm -f "$tmp_candidates" "$tmp_matches"' EXIT

scan_pattern() {
  local pattern="$1"
  redis_cli --scan --pattern "$pattern" >> "$tmp_candidates"
}

if [ -n "$PROMPT_CACHE_PATTERN" ]; then
  scan_pattern "$PROMPT_CACHE_PATTERN"
  sort -u "$tmp_candidates" > "$tmp_matches"
else
  scan_pattern "*prompt*"
  scan_pattern "*${PROMPT_NAME}*"

  prompt_name_lc="$(printf '%s' "$PROMPT_NAME" | tr '[:upper:]' '[:lower:]')"
  prompt_label_lc="$(printf '%s' "$PROMPT_LABEL" | tr '[:upper:]' '[:lower:]')"

  sort -u "$tmp_candidates" | while IFS= read -r key; do
    key_lc="$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]')"

    if [[ "$key_lc" == *prompt* && "$key_lc" == *"$prompt_name_lc"* ]]; then
      printf '%s\n' "$key"
      continue
    fi

    if [[ -n "$prompt_label_lc" && "$key_lc" == *prompt* && "$key_lc" == *"$prompt_label_lc"* && "$key_lc" == *"$prompt_name_lc"* ]]; then
      printf '%s\n' "$key"
    fi
  done > "$tmp_matches"
fi

match_count="$(wc -l < "$tmp_matches" | tr -d ' ')"

printf 'Prompt cache target: name=%s label=%s\n' "$PROMPT_NAME" "$PROMPT_LABEL"
if [ -n "$PROMPT_CACHE_PATTERN" ]; then
  printf 'Redis scan pattern override: %s\n' "$PROMPT_CACHE_PATTERN"
fi

if [ "$match_count" = "0" ]; then
  printf 'No matching Redis prompt cache keys found.\n'
  printf 'Note: the Python Langfuse SDK also keeps an in-process prompt cache; restart the backend or use cache_ttl_seconds=0 to clear that one.\n'
  exit 0
fi

printf 'Matching Redis keys: %s\n' "$match_count"

deleted=0
while IFS= read -r key; do
  if [ "$DRY_RUN" = "true" ] || [ "$DRY_RUN" = "1" ]; then
    printf '[dry-run] would delete %s\n' "$key"
    continue
  fi

  result="$(redis_cli DEL "$key" | tr -d '[:space:]')"
  deleted=$((deleted + result))
  printf 'deleted %s result=%s\n' "$key" "$result"
done < "$tmp_matches"

if [ "$DRY_RUN" = "true" ] || [ "$DRY_RUN" = "1" ]; then
  printf 'Dry run complete. No keys deleted.\n'
else
  printf 'Deleted Redis prompt cache keys: %s\n' "$deleted"
fi
