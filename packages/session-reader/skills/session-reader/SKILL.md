---
name: session-reader
description: Read and analyze Claude session logs from .claude-sessions directories. Use this skill whenever the user asks about past sessions, conversation history, session logs, what happened in a previous session, or wants to search across sessions for specific topics. Also use when the user references .claude-sessions or audit.jsonl files. This skill is essential because session logs are stored in a non-obvious format that is very easy to get wrong without guidance.
metadata:
  version: 0.1.0
allowed-tools: Bash(python3:*) Read
---

# Session Reader

Extract and analyze conversation content from Claude session logs (`.claude-sessions/`).

## Why this skill exists

Session logs are deceptively hard to work with:
- The `.json` metadata file does **not** contain conversation messages
- The actual conversation lives in `<session-dir>/audit.jsonl`
- Each JSONL line can be 100KB+ due to embedded MCP tool definitions
- Standard grep is unreliable — lines are too long and keywords appear in tool descriptions
- Content blocks are nested and vary in structure

This skill provides a script and a mental model to avoid these traps.

## Quick start

The extraction script is at `scripts/extract.py` (relative to this skill's base directory). It requires only Python 3 standard library.

```bash
# Full conversation transcript
python3 scripts/extract.py <session-id> --sessions-dir <path-to-.claude-sessions>

# Compact transcript (truncates long blocks — good for overview)
python3 scripts/extract.py --compact <session-id> --sessions-dir <path-to-.claude-sessions>

# Quick summary (title, model, date, message counts)
python3 scripts/extract.py --summary <session-id> --sessions-dir <path-to-.claude-sessions>

# Search for a topic within one session
python3 scripts/extract.py --search "paywall" <session-id> --sessions-dir <path-to-.claude-sessions>

# Search across ALL sessions for a topic
python3 scripts/extract.py --search "paywall" --sessions-dir <path-to-.claude-sessions>
```

The `<session-id>` can be:
- A full ID like `local_064790ae-461a-433d-8c3a-9f9d05a9fbd3`
- A path to the session directory
- A path to `audit.jsonl` directly

## When to use the script vs. reading directly

**Use the script** for:
- Getting an overview of what happened in a session
- Searching for a specific topic across multiple sessions
- Finding the relevant conversation turns quickly

**Read files directly** (with the Read tool) when:
- You need the exact JSON structure of a specific message
- You need to access `<persisted-output>` referenced files
- You need metadata from the `.json` file (title, model, initial message)

## Key rules

1. **Never grep raw session files for conversation content.** Lines are too long and noisy. Use the script or parse JSONL with Python.
2. **Start with `--summary`** to confirm you have the right session before reading the full transcript.
3. **The `.json` file is metadata only.** Don't waste time searching it for conversation messages.

For details on the file format, see [references/structure.md](references/structure.md).
