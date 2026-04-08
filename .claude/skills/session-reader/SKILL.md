---
name: session-reader
description: Read and analyze Claude session logs from .claude-sessions directories. Use this skill whenever the user asks about past sessions, conversation history, session logs, what happened in a previous session, or wants to search across sessions for specific topics. Also use when the user references .claude-sessions or audit.jsonl files. This skill is essential because session logs are stored in a non-obvious format that is very easy to get wrong without guidance.
metadata:
  version: 0.2.0
allowed-tools: Bash(duckdb:*) Bash(scripts/session.sh:*) Read
---

# Session Reader

Extract and analyze conversation content from Claude session logs (`.claude-sessions/`).

## Prerequisites

- **DuckDB** must be installed: `brew install duckdb`

## Why this skill exists

Session logs are deceptively hard to work with:
- The `.json` metadata file does **not** contain conversation messages
- The actual conversation lives in `<session-dir>/audit.jsonl`
- Each JSONL line can be 100KB+ due to embedded MCP tool definitions
- Content blocks are nested and vary in structure

DuckDB reads JSONL natively and handles all of this, but you still need to know the schema and filtering rules. This skill provides a convenience wrapper and the mental model to avoid common traps.

## Quick start

The wrapper script is at `scripts/session.sh` (relative to this skill's base directory).

```bash
# Full conversation transcript
scripts/session.sh transcript <session-id>

# Compact transcript (truncates long content blocks — good for overview)
scripts/session.sh compact <session-id>

# Quick summary (title, model, date, message counts)
scripts/session.sh summary <session-id>

# Search for a topic within one session
scripts/session.sh search "paywall" <session-id>

# Search across ALL sessions for a topic
scripts/session.sh search "deadlock"
```

The `<session-id>` can be:
- A full ID like `local_064790ae-461a-433d-8c3a-9f9d05a9fbd3`
- A path to the session directory
- A path to `audit.jsonl` directly

Set `SESSIONS_DIR` to override auto-discovery of `.claude-sessions/`.

## When to use what

**Use `scripts/session.sh`** for:
- Getting an overview of what happened in a session
- Searching for a specific topic across multiple sessions
- Finding the relevant conversation turns quickly

**Use DuckDB directly** for:
- Ad-hoc analytical queries the script modes don't cover
- Aggregation, joins, window functions over session data
- See "Ad-hoc DuckDB queries" below

**Read files directly** (with the Read tool) when:
- You need the exact JSON structure of a specific message
- You need to access `<persisted-output>` referenced files
- You need metadata from the `.json` file (title, model, initial message)

## Key rules

1. **Never grep raw session files.** Lines are too long and noisy. Use the script or DuckDB.
2. **Start with `summary`** to confirm you have the right session before reading the full transcript.
3. **The `.json` file is metadata only.** Don't search it for conversation messages.

## Ad-hoc DuckDB queries

For questions the script modes don't cover, run DuckDB directly. The canonical boilerplate:

```sql
duckdb -markdown -c "
  SELECT ...
  FROM read_json_auto('<path>/audit.jsonl',
    format='newline_delimited',
    maximum_object_size=10485760)
  WHERE type IN ('user', 'assistant')
    AND (subtype IS NULL OR subtype NOT IN ('init','permission_request','permission_response','mcp_tool_result'))
"
```

For cross-session queries, use a glob:

```sql
duckdb -markdown -c "
  SELECT ...
  FROM read_json_auto('<sessions-dir>/local_*/audit.jsonl',
    format='newline_delimited',
    maximum_object_size=10485760,
    filename=true,
    union_by_name=true)
"
```

### Recipe: Count tool usage by tool name

```sql
SELECT
  el.name as tool,
  count(*) as calls
FROM read_json_auto('path/audit.jsonl', format='newline_delimited', maximum_object_size=10485760),
  LATERAL (SELECT unnest(from_json(message.content::varchar, '["json"]')) as el)
WHERE type = 'assistant' AND el.type = 'tool_use'
GROUP BY el.name ORDER BY calls DESC;
```

### Recipe: Message timeline by hour

```sql
SELECT
  strftime(to_timestamp(epoch_ms(_audit_timestamp::varchar)), '%H:%M') as time,
  type as role,
  left(message.content::varchar, 100) as preview
FROM read_json_auto('path/audit.jsonl', format='newline_delimited', maximum_object_size=10485760)
WHERE type IN ('user', 'assistant')
ORDER BY _audit_timestamp;
```

For details on the file format, see [references/structure.md](references/structure.md).
