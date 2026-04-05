# Autopilot Careers

Monorepo for career automation tools — resume rendering, job fetching, bullet embeddings, and a Claude Code plugin.

## Packages

| Package | Description |
|---------|-------------|
| `packages/renderer` | Headless Markdown-to-PDF resume renderer (MCP server + CLI) |
| `packages/fetcher` | Job posting fetcher (MCP server + CLI) |
| `packages/bullet-embeddings` | Bullet trust signals via Vectra + Ollama (MCP server) |
| `packages/db` | Career data: resumes, job descriptions, journal |
| `packages/claude-marketplace` | Claude Code write-resume plugin |

## Quick Start

```bash
pnpm install
pnpm build        # typecheck + bundle all packages
pnpm test         # run tests across all packages
pnpm typecheck    # type-check only
```

## Debugging with Claude Sessions

The `.claude-sessions` symlink at the repo root points to the Claude Code local agent-mode session directory for this project:

```
.claude-sessions/ -> ~/Library/Application Support/Claude/local-agent-mode-sessions/<project-id>/<session-id>/
```

This directory contains conversation transcripts, tool call logs, and agent trajectory data produced by Claude Code while working on this repo.

### Using the session data for debugging

- **Trajectory audit** — Review `.json` / `.jsonl` files to inspect the full sequence of tool calls, reasoning steps, and decisions the AI made during a session. This lets you identify where it went wrong or took suboptimal paths.
- **Self-optimization** — Point the AI at its own session logs to diagnose patterns like unnecessary retries, missed context, or redundant searches. Ask it to read a specific session file and suggest how it could have handled the task better.
- **Reproducing issues** — Session files capture the exact inputs, tool arguments, and outputs. Use them to replay or reproduce a failing interaction.
- **Comparing approaches** — Diff two session logs to see how different prompts or starting contexts led to different tool-call trajectories for similar tasks.

### Example usage

```bash
# List all sessions
ls .claude-sessions/

# Read a specific session transcript
cat .claude-sessions/local_<session-id>.jsonl | jq .

# Have Claude audit its own trajectory
# (paste a session file path and ask it to analyze the decisions)
```

> **Note:** `.claude-sessions` is gitignored — it's a machine-local symlink and the session data is specific to your Claude Code installation.
