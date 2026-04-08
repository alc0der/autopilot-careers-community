#!/usr/bin/env bash
# session.sh — Query Claude session logs via DuckDB
set -euo pipefail

# ── Dependency check ────────────────────────────────────────────────────
if ! command -v duckdb &>/dev/null; then
  echo "Error: duckdb not found. Install with: brew install duckdb" >&2
  exit 1
fi

# ── Usage ───────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
Usage:
  session.sh transcript <session>              Full conversation
  session.sh compact    <session>              Truncated conversation
  session.sh summary    <session>              Metadata + message counts
  session.sh search     <pattern> [<session>]  Search one or all sessions

<session> can be: session ID, path to directory, or path to audit.jsonl
EOF
  exit 1
}

# ── Session resolution ──────────────────────────────────────────────────
find_sessions_dir() {
  local dir="${SESSIONS_DIR:-}"
  if [[ -n "$dir" && -d "$dir" ]]; then echo "$dir"; return; fi
  dir="$(pwd)"
  while [[ "$dir" != "/" ]]; do
    [[ -d "$dir/.claude-sessions" ]] && { echo "$dir/.claude-sessions"; return; }
    dir="$(dirname "$dir")"
  done
  return 1
}

resolve_session() {
  local input="$1"

  # Direct path to audit.jsonl
  if [[ "$(basename "$input")" == "audit.jsonl" && -f "$input" ]]; then
    echo "$(cd "$(dirname "$input")" && pwd)/audit.jsonl"; return
  fi

  # Path to session directory
  if [[ -d "$input" && -f "$input/audit.jsonl" ]]; then
    echo "$(cd "$input" && pwd)/audit.jsonl"; return
  fi

  # Bare session ID — resolve inside sessions dir
  local sdir
  sdir="$(find_sessions_dir)" || { echo "Error: cannot find .claude-sessions/" >&2; return 1; }
  for prefix in "" "local_"; do
    local cid="${prefix}${input}"
    [[ "$input" == local_* ]] && cid="$input"
    if [[ -f "$sdir/$cid/audit.jsonl" ]]; then
      echo "$sdir/$cid/audit.jsonl"; return
    fi
  done

  echo "Error: no audit.jsonl found for: $input" >&2
  return 1
}

resolve_metadata() {
  local audit="$1"
  local session_dir="$(dirname "$audit")"
  local meta="${session_dir}.json"
  [[ -f "$meta" ]] && { echo "$meta"; return; }
  return 1
}

# ── DuckDB helper ───────────────────────────────────────────────────────
DUCKDB_OPTS="format='newline_delimited', maximum_object_size=10485760"

# ── Commands ────────────────────────────────────────────────────────────
cmd_transcript() {
  local audit="$1" truncate="${2:-0}"
  local content_expr="message.content::varchar"
  if (( truncate > 0 )); then
    content_expr="left(message.content::varchar, $truncate)"
  fi
  duckdb -markdown -c "
    SELECT
      row_number() OVER () as line,
      CASE type WHEN 'user' THEN 'USER' ELSE 'ASST' END as role,
      $content_expr as content
    FROM read_json_auto('$audit', $DUCKDB_OPTS)
    WHERE type IN ('user', 'assistant')
      AND (subtype IS NULL
           OR subtype NOT IN ('init','permission_request','permission_response','mcp_tool_result'))
    ORDER BY _audit_timestamp;
  "
}

cmd_summary() {
  local audit="$1"
  local meta
  if meta="$(resolve_metadata "$audit")"; then
    duckdb -line -c "
      SELECT
        sessionId as session_id,
        title,
        model,
        strftime(to_timestamp(createdAt / 1000), '%Y-%m-%d %H:%M') as created,
        strftime(to_timestamp(lastActivityAt / 1000), '%Y-%m-%d %H:%M') as last_activity,
        left(initialMessage, 200) as initial_message
      FROM read_json_auto('$meta', format='auto', maximum_object_size=10485760);
    "
    echo ""
  fi
  duckdb -line -c "
    SELECT
      count(*) FILTER (WHERE type = 'user') as user_messages,
      count(*) FILTER (WHERE type = 'assistant') as assistant_messages,
      count(*) as total_lines
    FROM read_json_auto('$audit', $DUCKDB_OPTS);
  "
}

cmd_search_session() {
  local pattern="$1" audit="$2"
  duckdb -markdown -c "
    SELECT
      row_number() OVER () as line,
      CASE type WHEN 'user' THEN 'USER' ELSE 'ASST' END as role,
      left(message.content::varchar, 500) as content
    FROM read_json_auto('$audit', $DUCKDB_OPTS)
    WHERE type IN ('user', 'assistant')
      AND (subtype IS NULL
           OR subtype NOT IN ('init','permission_request','permission_response','mcp_tool_result'))
      AND message.content::varchar ILIKE '%${pattern//\'/\'\'}%'
    ORDER BY _audit_timestamp;
  "
}

cmd_search_all() {
  local pattern="$1" limit="${2:-10}"
  local sdir
  sdir="$(find_sessions_dir)" || { echo "Error: cannot find .claude-sessions/" >&2; exit 1; }
  duckdb -markdown -c "
    SELECT
      session_id,
      count(*) as matches,
      min(_audit_timestamp) as first_seen
    FROM read_json_auto('$sdir/local_*/audit.jsonl', $DUCKDB_OPTS, filename=true, union_by_name=true)
    WHERE type IN ('user', 'assistant')
      AND message.content::varchar ILIKE '%${pattern//\'/\'\'}%'
    GROUP BY session_id
    ORDER BY matches DESC
    LIMIT $limit;
  "
}

# ── Main ────────────────────────────────────────────────────────────────
(( $# >= 1 )) || usage
cmd="$1"; shift

case "$cmd" in
  transcript)
    (( $# >= 1 )) || usage
    audit="$(resolve_session "$1")"
    cmd_transcript "$audit"
    ;;
  compact)
    (( $# >= 1 )) || usage
    audit="$(resolve_session "$1")"
    cmd_transcript "$audit" 500
    ;;
  summary)
    (( $# >= 1 )) || usage
    audit="$(resolve_session "$1")"
    cmd_summary "$audit"
    ;;
  search)
    (( $# >= 1 )) || usage
    pattern="$1"; shift
    if (( $# >= 1 )); then
      audit="$(resolve_session "$1")"
      cmd_search_session "$pattern" "$audit"
    else
      cmd_search_all "$pattern"
    fi
    ;;
  *)
    usage
    ;;
esac
